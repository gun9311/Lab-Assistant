const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  tokens: [{ token: { type: String, required: true } }],
});

adminSchema.pre('save', async function(next) {
  const admin = this;
  if (admin.isModified('password')) {
    admin.password = await bcrypt.hash(admin.password, 8);
  }
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URL)
  .then(() => {
    console.log('MongoDB connected');
    seedAdmin();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// 관리자 계정 시딩 함수
const seedAdmin = async () => {
  try {
    console.log('Seeding admin user...');
    const admin = await Admin.findOne({ role: 'admin' });
    console.log('Admin user find query completed');
    if (!admin) {
      console.log('Admin user not found, creating one...');
      const newAdmin = new Admin({
        name: 'admin',
        password: 'admin',
        role: 'admin',
      });
      await newAdmin.save();
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};
