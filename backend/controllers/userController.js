const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const getStudents = async (req, res) => {
  const { school, grade, class: classNumber } = req.query;
  
  try {
    const students = await Student.find({ school, grade, class: classNumber });
    res.status(200).send(students);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch students' });
  }
};

const getProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user._id);
    }
    
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = req.user.role === 'teacher' ? ['name', 'school', 'phone', 'password'] : ['name', 'school', 'phone', 'password', 'grade', 'class'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    const filteredUpdates = updates.filter(update => allowedUpdates.includes(update)); // 허용된 필드만 추출
    console.log('Invalid updates:', updates); // 허용되지 않는 업데이트 로깅
    console.log('Filtered updates:', filteredUpdates); // 필터링된 업데이트 로깅
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user._id);
    }

    if (!user) {
      console.log('User not found:', req.user._id); // 사용자를 찾지 못했을 때 로깅
      return res.status(404).send();
    }

    updates.forEach(update => user[update] = req.body[update]);
    await user.save();

    res.send(user);
  } catch (error) {
    console.error('Error updating profile:', error); // 업데이트 에러 로깅
    res.status(400).send(error);
  }
};


const deleteProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findByIdAndDelete(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findByIdAndDelete(req.user._id);
    }

    if (!user) {
      return res.status(404).send();
    }

    res.send({ message: 'User deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
};

module.exports = {
  getStudents,
  getProfile, 
  updateProfile,
  deleteProfile,
};
