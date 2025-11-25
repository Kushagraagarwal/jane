import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
  Alert
} from '@mui/material';
import { CloudUpload, Delete } from '@mui/icons-material';

const ImageUpload = ({ value = [], onChange, maxFiles = 5, maxSize = 5242880 }) => {
  const [previews, setPreviews] = useState(value || []);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setError(null);

    // Check file count
    if (previews.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate files
    const validFiles = [];
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        setError(`File ${file.name} exceeds ${maxSize / 1024 / 1024}MB limit`);
        continue;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} is not an image`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));

    const updated = [...previews, ...newPreviews];
    setPreviews(updated);

    // Extract file objects for parent component
    const extractedFiles = updated.map(p => p.file);
    onChange(extractedFiles);
  };

  const handleRemove = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);

    const extractedFiles = updated.map(p => p.file);
    onChange(extractedFiles);
  };

  return (
    <Box>
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUpload />}
        disabled={previews.length >= maxFiles}
      >
        Upload Images
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleFileSelect}
        />
      </Button>

      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
        Max {maxFiles} files, {maxSize / 1024 / 1024}MB each. Formats: JPG, PNG
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {previews.length > 0 && (
        <ImageList sx={{ mt: 2 }} cols={3} gap={8}>
          {previews.map((preview, index) => (
            <ImageListItem key={index}>
              <img
                src={preview.url}
                alt={preview.name}
                loading="lazy"
                style={{ height: 150, objectFit: 'cover' }}
              />
              <ImageListItemBar
                title={preview.name}
                actionIcon={
                  <IconButton
                    sx={{ color: 'white' }}
                    onClick={() => handleRemove(index)}
                  >
                    <Delete />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </Box>
  );
};

export default ImageUpload;
