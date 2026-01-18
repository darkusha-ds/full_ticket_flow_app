// @mui material components
import Grid from "@mui/material/Grid";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

const START_YEAR = 2026;
const CURRENT_YEAR = new Date().getFullYear();
const yearLabel =
  CURRENT_YEAR > START_YEAR
    ? `${START_YEAR}-${CURRENT_YEAR}`
    : `${START_YEAR}`;

function Footer() {
  return (
    <VuiBox
      component="footer"
      py={6}
      sx={({ breakpoints }) => ({
        maxWidth: "450px",
        [breakpoints.down("xl")]: {
          maxWidth: "400px",
        },
      })}
    >
      <Grid container justifyContent="center">
        <Grid item xs={12} sx={{ textAlign: "center" }}>
          <VuiTypography
            variant="button"
            sx={{ textAlign: "center", fontWeight: "400 !important" }}
            color="text"
          >
            @ {yearLabel}, Made by{" "}
            <VuiTypography
              component="a"
              variant="button"
              href="https://dark-angel.ru"
              sx={{ textAlign: "center", fontWeight: "500 !important" }}
              color="text"
              mr="2px"
            >
            Dark Angel
            </VuiTypography>
          </VuiTypography>
        </Grid>
        {/* <Grid item xs={10}>
          <VuiBox display="flex" justifyContent="center" flexWrap="wrap" mb={3}>
            <VuiBox mr={{ xs: "20px", lg: "46px" }}>
              <VuiTypography component="a" href="#" variant="body2" color="text">
                Marketplace
              </VuiTypography>
            </VuiBox>
            <VuiBox mr={{ xs: "20px", lg: "46px" }}>
              <VuiTypography component="a" href="#" variant="body2" color="text">
                Blog
              </VuiTypography>
            </VuiBox>
            <VuiBox>
              <VuiTypography component="a" href="#" variant="body2" color="text">
                License
              </VuiTypography>
            </VuiBox>
          </VuiBox>
        </Grid> */}
      </Grid>
    </VuiBox>
  );
}

export default Footer;
