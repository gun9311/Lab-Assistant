const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');

const getStudents = async (req, res) => {
  const { school, grade, class: classNumber, uniqueIdentifier } = req.query;
  
  try {
    const students = await Student.find({
      school,
      grade,
      class: classNumber,
      loginId: { $regex: `^${uniqueIdentifier}` } // loginId의 앞부분으로 필터링
    });
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
  // const allowedUpdates = req.user.role === 'teacher' ? ['name', 'school', 'email'] : ['password'];
  // const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  // if (!isValidOperation) {
  //   console.warn('Invalid updates:', updates);
  //   return res.status(400).send({ error: 'Invalid updates!' });
  // }

  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user._id);
    }

    if (!user) {
      console.log('User not found:', req.user._id);
      return res.status(404).send();
    }

    // 이메일 중복 체크
    if (req.body.email) {
      const emailExists = await Teacher.findOne({ email: req.body.email });
      if (emailExists && emailExists._id.toString() !== req.user._id.toString()) {
        return res.status(400).send({ error: 'Email already in use' });
      }
    }

    // 비밀번호 변경 요청인 경우
    if (req.user.role === 'student') {
      const { currentPassword, password: newPassword } = req.body;

      // 현재 비밀번호 확인
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).send({ error: 'Current password is incorrect' });
      }

      // 새 비밀번호로 설정
      user.password = newPassword;
    }

    updates.forEach(update => {
      if (update !== 'password') {
        user[update] = req.body[update];
      }
    });

    await user.save();
    res.send(user);
  } catch (error) {
    console.error('Error updating profile:', error);
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
