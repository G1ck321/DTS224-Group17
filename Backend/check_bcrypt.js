import bcrypt from 'bcrypt';
const hash = '$2b$10$EPf9XUq.S/E76B1f6b1Sbu6N4Q.bZ264pEorE.G7F7vU5.M.Pia1.';
const match = await bcrypt.compare('password', hash);
console.log('Password match:', match);
