import { useState } from "react";

// react-router-dom components
import { Link, useHistory, useLocation } from "react-router-dom";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import VuiSwitch from "components/VuiSwitch";
import GradientBorder from "examples/GradientBorder";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgSignIn from "assets/images/signInImage.png";

// Auth utils
import { saveAuth } from "utils/auth";

function SignIn() {
  const history = useHistory();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");

    const emailClean = (email || "").trim();

    if (!emailClean || !password) {
      setErrorMessage("Email and password are required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Nginx proxies /api -> API container
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // важно: не отправляем лишнего
        body: JSON.stringify({ email: emailClean, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        // не палим детали сервера, но выводим message если он есть
        setErrorMessage(data?.message || "Failed to sign in");
        return;
      }

      // Expecting: { accessToken, user }
      if (!data?.accessToken) {
        setErrorMessage("Invalid server response (no accessToken).");
        return;
      }

      saveAuth({ accessToken: data.accessToken, user: data.user, rememberMe });

      const redirectTo = location?.state?.from?.pathname || "/dashboard";
      history.replace(redirectTo);
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CoverLayout
      title="Nice to see you!"
      color="white"
      description="Enter your email and password to sign in"
      premotto="INSPIRED BY THE FUTURE:"
      motto="THE VISION UI DASHBOARD"
      image={bgSignIn}
    >
      <VuiBox component="form" role="form" onSubmit={handleSubmit} noValidate>
        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
              Email
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            padding="1px"
            borderRadius={borders.borderRadius.lg}
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            <VuiInput
              type="email"
              placeholder="Your email..."
              fontWeight="500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputProps={{ maxLength: 254 }}
            />
          </GradientBorder>
        </VuiBox>

        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
              Password
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            borderRadius={borders.borderRadius.lg}
            padding="1px"
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            <VuiInput
              type="password"
              placeholder="Your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              sx={({ typography: { size } }) => ({ fontSize: size.sm })}
              inputProps={{ maxLength: 200 }}
            />
          </GradientBorder>
        </VuiBox>

        <VuiBox display="flex" alignItems="center">
          <VuiSwitch color="info" checked={rememberMe} onChange={handleSetRememberMe} />
          <VuiTypography
            variant="caption"
            color="white"
            fontWeight="medium"
            onClick={handleSetRememberMe}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            &nbsp;&nbsp;&nbsp;&nbsp;Remember me
          </VuiTypography>
        </VuiBox>

        {errorMessage ? (
          <VuiBox mt={2}>
            <VuiTypography variant="caption" color="error" fontWeight="medium">
              {errorMessage}
            </VuiTypography>
          </VuiBox>
        ) : null}

        <VuiBox mt={4} mb={1}>
          <VuiButton color="info" fullWidth type="submit" disabled={isSubmitting}>
            {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
          </VuiButton>
        </VuiBox>

        <VuiBox mt={3} textAlign="center">
          <VuiTypography variant="button" color="text" fontWeight="regular">
            Don&apos;t have an account?{" "}
            <VuiTypography
              component={Link}
              to="/authentication/sign-up"
              variant="button"
              color="white"
              fontWeight="medium"
            >
              Sign up
            </VuiTypography>
          </VuiTypography>
        </VuiBox>
      </VuiBox>
    </CoverLayout>
  );
}

export default SignIn;