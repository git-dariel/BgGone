import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal, Progress } from "../../components/ui";
import { UploadZone } from "../../components/upload-zone";

describe("shared controls", () => {
  it("focuses the dialog and restores focus when it closes", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      <Modal title="Confirm action" onClose={onClose}>
        <button type="button">Confirm</button>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Close dialog" })).toBe(document.activeElement);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toBe(document.activeElement);
    trigger.remove();
  });

  it("passes selected image files to the upload control", async () => {
    const onFiles = vi.fn();
    render(<UploadZone onFiles={onFiles} />);
    const file = new File(["image"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Select an image"), file);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("keeps progress within its accessible range", () => {
    render(<Progress value={120} label="Upload progress" />);
    expect(screen.getByRole("progressbar", { name: "Upload progress" }).getAttribute("aria-valuenow")).toBe("100");
  });
});
