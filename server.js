import './config/env.js';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT;

const startServer = async () => {

    await connectDB();
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    
    process.on('SIGTERM', () => {
        console.log('SIGTERM received. Closing server...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
};

startServer();