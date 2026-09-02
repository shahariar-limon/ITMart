import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../features/auth/AuthProvider";
import { App } from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("App routing", () => {
  it("renders the home page", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /tech that keeps you moving/i }),
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated users from the dashboard", () => {
    renderAt("/dashboard");
    expect(
      screen.getByRole("heading", { name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it("renders the registration form", () => {
    renderAt("/register");
    expect(
      screen.getByRole("heading", { name: /create your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeRequired();
  });
});
