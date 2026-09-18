import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

describe("Home", () => {
  it("shows the unofficial-pilot disclaimer", () => {
    render(<Home />);
    expect(
      screen.getByText(/স্বাধীন, পরীক্ষামূলক সহায়ক/)
    ).toBeInTheDocument();
    expect(screen.getByText(/সরকারি পরিষেবা নয়/)).toBeInTheDocument();
  });
});
