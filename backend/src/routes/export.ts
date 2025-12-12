import express from 'express';
import { ExportConfiguration, ShareableAnalysis } from '../types';

const router = express.Router();

// In-memory storage for shared analyses (in production, this would be a database)
const sharedAnalysesStore = new Map<string, ShareableAnalysis>();

// POST /api/export - Export analysis data
router.post('/export', (req, res) => {
  try {
    const config: ExportConfiguration = req.body;
    
    if (!config.format) {
      return res.status(400).json({ error: 'Export format is required' });
    }
    
    // Mock export functionality
    // In a real implementation, this would generate actual files
    
    if (config.format === 'csv') {
      const csvData = generateMockCSV(config);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lunar-crime-analysis.csv"');
      return res.send(csvData);
    } else if (config.format === 'pdf') {
      // Mock PDF generation
      const pdfBuffer = Buffer.from('Mock PDF content');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="lunar-crime-analysis.pdf"');
      return res.send(pdfBuffer);
    } else if (config.format === 'png') {
      // Mock PNG generation
      const pngBuffer = Buffer.from('Mock PNG content');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="lunar-crime-analysis.png"');
      return res.send(pngBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Error exporting analysis:', error);
    return res.status(500).json({ error: 'Failed to export analysis' });
  }
});

// POST /api/shared - Create shareable analysis link
router.post('/shared', (req, res) => {
  try {
    const config: ExportConfiguration = req.body;
    
    // Generate a unique share ID
    const shareId = Math.random().toString(36).substr(2, 9);
    
    // Create shared analysis data
    const sharedAnalysis: ShareableAnalysis = {
      id: shareId,
      location: 'New York City, NY', // This would come from the request
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31'),
      },
      filters: {}, // This would come from the request
      exportConfig: config,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    
    // Store in memory (in production, this would be stored in a database)
    sharedAnalysesStore.set(shareId, sharedAnalysis);
    
    return res.json(sharedAnalysis);
  } catch (error) {
    console.error('Error creating shared analysis:', error);
    return res.status(500).json({ error: 'Failed to create shared analysis' });
  }
});

// GET /api/shared/:id - Retrieve shared analysis
router.get('/shared/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Retrieve from memory storage (in production, this would query a database)
    const sharedAnalysis = sharedAnalysesStore.get(id);
    
    if (!sharedAnalysis) {
      return res.status(404).json({ error: 'Shared analysis not found' });
    }
    
    // Check if the shared analysis has expired
    if (sharedAnalysis.expiresAt && sharedAnalysis.expiresAt < new Date()) {
      // Remove expired analysis from storage
      sharedAnalysesStore.delete(id);
      return res.status(404).json({ error: 'Shared analysis has expired' });
    }
    
    return res.json(sharedAnalysis);
  } catch (error) {
    console.error('Error retrieving shared analysis:', error);
    return res.status(500).json({ error: 'Failed to retrieve shared analysis' });
  }
});

// Helper function to generate mock CSV data
function generateMockCSV(config: ExportConfiguration): string {
  const headers = ['Date', 'Moon Phase', 'Crime Type', 'Crime Count', 'Correlation'];
  const rows = [
    ['2023-01-01', 'New', 'Violent', '15', '0.12'],
    ['2023-01-08', 'First Quarter', 'Violent', '22', '0.18'],
    ['2023-01-15', 'Full', 'Violent', '35', '0.31'],
    ['2023-01-23', 'Last Quarter', 'Violent', '18', '0.15'],
    ['2023-01-30', 'New', 'Violent', '14', '0.10'],
  ];
  
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  return csvContent;
}

export default router;