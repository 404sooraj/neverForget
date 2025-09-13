import { Request, Response, NextFunction } from 'express';

export const errorLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object for tracking
  (req as any).requestId = requestId;
  
  // Log incoming request details
  console.log(`\n=== INCOMING REQUEST [${requestId}] ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Query Params:`, JSON.stringify(req.query, null, 2));
  console.log(`Body:`, JSON.stringify(req.body, null, 2));
  
  // Log file upload details if present
  if (req.file) {
    console.log(`File Upload Details:`);
    console.log(`  - Fieldname: ${req.file.fieldname}`);
    console.log(`  - Originalname: ${req.file.originalname}`);
    console.log(`  - Mimetype: ${req.file.mimetype}`);
    console.log(`  - Size: ${req.file.size} bytes`);
    console.log(`  - Path: ${req.file.path}`);
  }
  
  // Log files array if present (for multiple file uploads)
  if (req.files) {
    console.log(`Files Array:`, JSON.stringify(req.files, null, 2));
  }
  
  // Override res.json to log response details
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    console.log(`\n=== RESPONSE [${requestId}] ===`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Response Body:`, JSON.stringify(body, null, 2));
    console.log(`=== END REQUEST [${requestId}] ===\n`);
    
    return originalJson.call(this, body);
  };
  
  // Override res.status to log status changes
  const originalStatus = res.status;
  res.status = function(code: number) {
    console.log(`\n=== STATUS CHANGE [${requestId}] ===`);
    console.log(`Status Code: ${code}`);
    console.log(`=== END STATUS CHANGE [${requestId}] ===\n`);
    return originalStatus.call(this, code);
  };
  
  next();
};

export const errorHandlerMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || 'unknown';
  
  console.log(`\n=== ERROR [${requestId}] ===`);
  console.log(`Error Message: ${err.message}`);
  console.log(`Error Stack: ${err.stack}`);
  console.log(`Request Details:`, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    file: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : null
  });
  console.log(`=== END ERROR [${requestId}] ===\n`);
  
  // Send error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: requestId
  });
};
