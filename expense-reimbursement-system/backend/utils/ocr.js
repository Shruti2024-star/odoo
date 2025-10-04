const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const processReceipt = async (imagePath) => {
  try {
    console.log('Starting OCR processing...');
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    console.log('OCR Text extracted:', text);
    console.log('Confidence:', confidence);

    // Extract structured data from OCR text
    const extractedData = extractExpenseData(text);
    
    return {
      extractedText: text,
      confidence: confidence,
      extractedAmount: extractedData.amount,
      extractedDate: extractedData.date,
      extractedMerchant: extractedData.merchant,
      processed: true
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to process receipt image');
  }
};

const extractExpenseData = (text) => {
  const data = {
    amount: null,
    date: null,
    merchant: null
  };

  // Extract amount (look for currency patterns)
  const amountRegex = /(\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY)?\s*(\d+\.?\d*)/g;
  const amounts = [];
  let match;
  
  while ((match = amountRegex.exec(text)) !== null) {
    const amount = parseFloat(match[2]);
    if (amount > 0) {
      amounts.push(amount);
    }
  }
  
  // Take the largest amount as the expense amount
  if (amounts.length > 0) {
    data.amount = Math.max(...amounts);
  }

  // Extract date (various date formats)
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
  const dates = [];
  
  while ((match = dateRegex.exec(text)) !== null) {
    const dateStr = match[0];
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      dates.push(date);
    }
  }
  
  // Take the most recent date
  if (dates.length > 0) {
    data.date = new Date(Math.max(...dates));
  }

  // Extract merchant name (usually at the top of receipt)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    // Look for common merchant patterns
    const merchantPatterns = [
      /^[A-Z\s&]+$/,
      /restaurant/i,
      /hotel/i,
      /store/i,
      /shop/i,
      /cafe/i,
      /bar/i
    ];
    
    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      if (merchantPatterns.some(pattern => pattern.test(line))) {
        data.merchant = line.trim();
        break;
      }
    }
    
    // If no pattern matches, use the first non-empty line
    if (!data.merchant && lines[0]) {
      data.merchant = lines[0].trim();
    }
  }

  return data;
};

module.exports = {
  processReceipt,
  extractExpenseData
};
