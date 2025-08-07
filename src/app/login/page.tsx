import LoginForm from "@/components/auth/LoginForm";
//import AuthDebugger from "@/components/debug/AuthDebugger";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex items-center justify-center">
            <LoginForm />
          </div>
            {/* <div className="bg-white rounded-lg shadow-md p-6">
         {<AuthDebugger />
          </div>*/}
        </div>
      </div>
    </div>
  );
}