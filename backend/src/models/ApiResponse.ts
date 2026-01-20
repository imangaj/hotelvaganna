import { Response } from "express";

export class ApiResponse {
  static success(res: Response, data: any, message: string = "Success", statusCode: number = 200) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message: string, statusCode: number = 400, errors?: any) {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static paginated(
    res: Response,
    data: any[],
    total: number,
    page: number,
    limit: number,
    statusCode: number = 200
  ) {
    res.status(statusCode).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
}

export default ApiResponse;
