import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` VIRTS SYSTEM BACKEND LIVE & LISTENING ON PORT: ${PORT}`);
    console.log(` TARGET MODE: PRODUCTION ACADEMIC RUNTIME ENVIRONMENT`);
    console.log(`====================================================`);
});
