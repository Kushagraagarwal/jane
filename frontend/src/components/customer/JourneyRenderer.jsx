import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Checkbox,
  FormGroup,
  TextField,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { ArrowBack, ArrowForward, Send } from '@mui/icons-material';
import ImageUpload from '../common/ImageUpload';
import { getNextNode, validateAnswer } from '../../utils/journeyEvaluator';
import { uploadImages } from '../../services/api';

const JourneyRenderer = ({ journey, onComplete }) => {
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState({});

  useEffect(() => {
    if (journey && journey.nodes) {
      setCurrentNodeId(journey.nodes.startNode);
    }
  }, [journey]);

  if (!journey || !journey.nodes || !currentNodeId) {
    return <Typography>Loading journey...</Typography>;
  }

  const currentNode = journey.nodes.nodes[currentNodeId];

  if (!currentNode) {
    return <Typography>Error: Invalid journey configuration</Typography>;
  }

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [currentNodeId]: value
    });
    setErrors([]);
  };

  const handleNext = async () => {
    const answer = answers[currentNodeId];

    // Validate answer
    const validationErrors = validateAnswer(currentNode, answer);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Handle image upload
    if (currentNode.questionType === 'image_upload' && answer && answer.length > 0) {
      try {
        setLoading(true);
        const response = await uploadImages(answer);
        setUploadedImages({
          ...uploadedImages,
          [currentNodeId]: response.data.urls
        });
      } catch (error) {
        setErrors(['Failed to upload images. Please try again.']);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    // Move to next node
    const nextNode = getNextNode(currentNode, answer, {}, journey.nodes.nodes);

    if (!nextNode || nextNode.type === 'end') {
      // Journey complete, submit ticket
      handleSubmit();
      return;
    }

    // Add to history and move forward
    setHistory([...history, currentNodeId]);
    setCurrentNodeId(nextNode.id);
    setErrors([]);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const previousNodeId = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentNodeId(previousNodeId);
      setErrors([]);
    }
  };

  const handleSubmit = () => {
    // Prepare journey data
    const journeyData = {};
    Object.keys(answers).forEach(nodeId => {
      const node = journey.nodes.nodes[nodeId];
      journeyData[nodeId] = {
        question: node.question,
        answer: answers[nodeId],
        images: uploadedImages[nodeId] || []
      };
    });

    // Create ticket subject from first question
    const firstAnswer = Object.values(journeyData)[0];
    const subject = firstAnswer ? `Support Request: ${firstAnswer.answer}` : 'Support Request';

    // Collect all images
    const allImages = Object.values(uploadedImages).flat();

    onComplete({
      journey_id: journey.id,
      journey_data: journeyData,
      subject: subject,
      description: 'Ticket created from customer journey',
      attachments: allImages
    });
  };

  const renderQuestionInput = () => {
    const answer = answers[currentNodeId];

    switch (currentNode.questionType) {
      case 'single_choice':
        return (
          <FormControl component="fieldset">
            <FormLabel component="legend">{currentNode.question}</FormLabel>
            <RadioGroup
              value={answer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            >
              {currentNode.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'multiple_choice':
        return (
          <FormControl component="fieldset">
            <FormLabel component="legend">{currentNode.question}</FormLabel>
            <FormGroup>
              {currentNode.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={(answer || []).includes(option.value)}
                      onChange={(e) => {
                        const current = answer || [];
                        const newValue = e.target.checked
                          ? [...current, option.value]
                          : current.filter(v => v !== option.value);
                        handleAnswerChange(newValue);
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </FormControl>
        );

      case 'text_input':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={currentNode.question}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            variant="outlined"
          />
        );

      case 'image_upload':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {currentNode.question}
            </Typography>
            <ImageUpload
              value={answer || []}
              onChange={handleAnswerChange}
              maxFiles={currentNode.validation?.maxFiles || 5}
            />
          </Box>
        );

      default:
        return <Typography>Unknown question type</Typography>;
    }
  };

  // Calculate progress
  const totalSteps = Object.keys(journey.nodes.nodes).length - 1; // Exclude end node
  const currentStep = history.length + 1;

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {journey.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {journey.description}
        </Typography>

        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Step {currentStep} of {totalSteps}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(currentStep / totalSteps) * 100}
            sx={{ mt: 1 }}
          />
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        {renderQuestionInput()}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            disabled={history.length === 0 || loading}
          >
            Back
          </Button>

          <Button
            variant="contained"
            endIcon={currentNode.nextNodeId ? <ArrowForward /> : <Send />}
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Processing...' : currentNode.nextNodeId ? 'Next' : 'Submit'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default JourneyRenderer;
