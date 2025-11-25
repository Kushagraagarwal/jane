const { Journey, User } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/journeys
// @desc    Get all journeys (admin: all, customer: active only)
// @access  Private
exports.getJourneys = async (req, res) => {
  try {
    const whereClause = {};

    // Customers can only see active journeys
    if (req.user.role === 'customer') {
      whereClause.status = 'active';
    }

    const journeys = await Journey.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: journeys.length,
      journeys
    });
  } catch (error) {
    console.error('Get journeys error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/journeys/:id
// @desc    Get single journey
// @access  Private
exports.getJourney = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Customers can only view active journeys
    if (req.user.role === 'customer' && journey.status !== 'active') {
      return res.status(403).json({ error: 'Not authorized to view this journey' });
    }

    res.json({
      success: true,
      journey
    });
  } catch (error) {
    console.error('Get journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/journeys
// @desc    Create new journey
// @access  Private (Admin only)
exports.createJourney = async (req, res) => {
  try {
    const { name, description, nodes } = req.body;

    const journey = await Journey.create({
      name,
      description,
      nodes,
      created_by: req.user.id,
      version: 1,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      journey
    });
  } catch (error) {
    console.error('Create journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT /api/journeys/:id
// @desc    Update journey
// @access  Private (Admin only)
exports.updateJourney = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id);

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const { name, description, nodes } = req.body;

    // If journey is active, create new version
    if (journey.status === 'active') {
      journey.status = 'archived';
      await journey.save();

      const newJourney = await Journey.create({
        name: name || journey.name,
        description: description || journey.description,
        nodes: nodes || journey.nodes,
        created_by: req.user.id,
        version: journey.version + 1,
        status: 'draft'
      });

      return res.json({
        success: true,
        journey: newJourney,
        message: 'New version created'
      });
    }

    // Update draft journey
    journey.name = name || journey.name;
    journey.description = description || journey.description;
    journey.nodes = nodes || journey.nodes;
    await journey.save();

    res.json({
      success: true,
      journey
    });
  } catch (error) {
    console.error('Update journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/journeys/:id/publish
// @desc    Publish journey (make it active)
// @access  Private (Admin only)
exports.publishJourney = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id);

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Deactivate all other active journeys (only one can be active)
    await Journey.update(
      { status: 'archived' },
      { where: { status: 'active' } }
    );

    journey.status = 'active';
    journey.published_at = new Date();
    await journey.save();

    res.json({
      success: true,
      journey,
      message: 'Journey published successfully'
    });
  } catch (error) {
    console.error('Publish journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/journeys/:id/archive
// @desc    Archive journey
// @access  Private (Admin only)
exports.archiveJourney = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id);

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    journey.status = 'archived';
    await journey.save();

    res.json({
      success: true,
      journey,
      message: 'Journey archived successfully'
    });
  } catch (error) {
    console.error('Archive journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/journeys/:id/versions
// @desc    Get all versions of a journey
// @access  Private (Admin only)
exports.getJourneyVersions = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id);

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Find all journeys with the same name
    const versions = await Journey.findAll({
      where: { name: journey.name },
      order: [['version', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      count: versions.length,
      versions
    });
  } catch (error) {
    console.error('Get journey versions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/journeys/:id/rollback/:version
// @desc    Rollback to specific journey version
// @access  Private (Admin only)
exports.rollbackJourney = async (req, res) => {
  try {
    const journey = await Journey.findByPk(req.params.id);

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const targetVersion = parseInt(req.params.version);

    // Find the target version
    const versionToRestore = await Journey.findOne({
      where: {
        name: journey.name,
        version: targetVersion
      }
    });

    if (!versionToRestore) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Create new journey from old version
    const newJourney = await Journey.create({
      name: journey.name,
      description: versionToRestore.description,
      nodes: versionToRestore.nodes,
      created_by: req.user.id,
      version: journey.version + 1,
      status: 'draft'
    });

    res.json({
      success: true,
      journey: newJourney,
      message: `Rolled back to version ${targetVersion}`
    });
  } catch (error) {
    console.error('Rollback journey error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
