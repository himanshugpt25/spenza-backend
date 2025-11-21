import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { tokenManager } from "../utils/tokenManager";

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        // Extract token from handshake auth or cookies
        const token = 
          socket.handshake.auth.token || 
          socket.handshake.headers.cookie
            ?.split("; ")
            .find((c) => c.startsWith("spenza-accessToken="))
            ?.split("=")[1];

        if (!token) {
          logger.warn({ socketId: socket.id }, "Socket connection rejected: No token provided");
          return next(new Error("Authentication required"));
        }

        // Verify JWT token
        const payload = tokenManager.verifyAccessToken(token);
        
        // Attach user info to socket
        (socket as any).userId = payload.sub;
        
        logger.info({ socketId: socket.id, userId: payload.sub }, "Socket authenticated");
        next();
      } catch (error) {
        logger.warn({ socketId: socket.id, error }, "Socket authentication failed");
        next(new Error("Invalid or expired token"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      const userId = (socket as any).userId;
      logger.info({ socketId: socket.id, userId }, "Client connected to socket");

      socket.on("join_subscription", (subscriptionId: string) => {
        logger.info({ socketId: socket.id, userId, subscriptionId }, "Client joining subscription room");
        socket.join(`subscription:${subscriptionId}`);
      });

      socket.on("leave_subscription", (subscriptionId: string) => {
        logger.info({ socketId: socket.id, userId, subscriptionId }, "Client leaving subscription room");
        socket.leave(`subscription:${subscriptionId}`);
      });

      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id, userId }, "Client disconnected from socket");
      });
    });

    logger.info("Socket.io initialized with authentication");
  }

  public emit(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    } else {
      logger.warn("Socket.io not initialized, cannot emit event");
    }
  }
}

export const socketService = SocketService.getInstance();
