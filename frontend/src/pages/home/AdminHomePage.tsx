import AddThings from "../../components/admin/AddThings";
import LogoutButton from "../../components/auth/LogoutButton";
import AdminStudentList from "../../components/admin/AdminStudentList";
import AdminTeacherList from "../../components/admin/AdminTeacherList";

const AdminHomePage = () => {
  return (
    <div>
      <h1>Admin Home Page</h1>
      <AddThings />
      <AdminStudentList />
      <AdminTeacherList />
      <LogoutButton />
    </div>
  );
};

export default AdminHomePage;