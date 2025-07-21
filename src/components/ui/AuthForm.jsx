import React, { useState } from "react";

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false); // toggle signup/login
  const [signupData, setSignupData] = useState({ username: "", password: "" });
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  const backendURL = "https://web-auth-app.onrender.com/api/auth"; 
  // Toggle forms
  const toggleForm = () => {
    setMessage("");
    setIsSignUp((prev) => !prev);
  };

  // Handle input change for both forms
  const handleChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === "signup") {
      setSignupData({ ...signupData, [name]: value });
    } else {
      setLoginData({ ...loginData, [name]: value });
    }
  };

  // Signup submit
  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${backendURL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setSignupData({ username: "", password: "" });
        setIsSignUp(false); // switch to login on success
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      setMessage("Server error");
    }
  };

  // Login submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${backendURL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setUser(data.user); // store logged-in user info
        setLoginData({ username: "", password: "" });
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      setMessage("Server error");
    }
  };

  // Logout user
  const handleLogout = () => {
    setUser(null);
    setMessage("");
  };

  return (
    <div className={`container ${isSignUp ? "active" : ""}`} style={{ maxWidth: 768, margin: "auto" }}>
      {!user ? (
        <>
          <div className="form-container sign-up">
            <form onSubmit={handleSignup}>
              <h1>Create Account</h1>
              <span>or use your email for registration</span>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={signupData.username}
                onChange={(e) => handleChange(e, "signup")}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={signupData.password}
                onChange={(e) => handleChange(e, "signup")}
                required
              />
              <button type="submit">Sign Up</button>
            </form>
          </div>

          <div className="form-container sign-in">
            <form onSubmit={handleLogin}>
              <h1>Sign In</h1>
              <span>or use your email and password</span>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => handleChange(e, "login")}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => handleChange(e, "login")}
                required
              />
              <button type="submit">Sign In</button>
            </form>
          </div>

          <div className="toggle-container">
            <div className="toggle">
              <div className="toggle-panel toggle-left">
                <h1>Welcome Back!</h1>
                <p>Enter your personal details to access our site!</p>
                <button className="hidden" onClick={toggleForm} id="login">
                  Sign In
                </button>
              </div>
              <div className="toggle-panel toggle-right">
                <h1>Hello, user!</h1>
                <p>Register with your personal details to access our site!</p>
                <button className="hidden" onClick={toggleForm} id="register">
                  Sign Up
                </button>
              </div>
            </div>
          </div>

        </>
      ) : (
      // Full screen profile container
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(to right, #5c6bc0, #2da0a8)",
          color: "white",
          fontSize: "1.5rem",
          textAlign: "center",
          padding: "2rem",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
        }}
      >
        <h1>Welcome, {user.username}!</h1>
        <p>This is your full screen profile page.</p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#fff",
            color: "#2da0a8",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>
    )}
    </div>
  );
};

export default AuthForm;
