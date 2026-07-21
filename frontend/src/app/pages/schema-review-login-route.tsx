import { AuthLandingPage } from "@/app/pages/AuthLandingPage";
import { SchemaReviewLoginPage } from "@/features/reviews/pages/schema-review-login-page";

export function SchemaReviewLoginRoute() {
  return (
    <SchemaReviewLoginPage
      renderLogin={(props) => (
        <AuthLandingPage defaultMode="login" availableModes={["login"]} {...props} />
      )}
    />
  );
}
