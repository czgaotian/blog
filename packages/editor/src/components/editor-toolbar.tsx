"use client";

import { forwardRef, useEffect, useState } from "react";

// --- UI Primitives ---
import { Button } from "./tiptap-ui-primitive/button";
import { Spacer } from "./tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "./tiptap-ui-primitive/toolbar";

// --- Tiptap UI ---
import { BlockquoteButton } from "./tiptap-ui/blockquote-button";
import { CodeBlockButton } from "./tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "./tiptap-ui/color-highlight-popover";
import { HeadingDropdownMenu } from "./tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "./tiptap-ui/image-upload-button";
import { LinkButton, LinkContent, LinkPopover } from "./tiptap-ui/link-popover";
import { ListDropdownMenu } from "./tiptap-ui/list-dropdown-menu";
import { MarkButton } from "./tiptap-ui/mark-button";
import { TextAlignButton } from "./tiptap-ui/text-align-button";
import { UndoRedoButton } from "./tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "./tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "./tiptap-icons/highlighter-icon";
import { LinkIcon } from "./tiptap-icons/link-icon";

type MobileToolbarView = "main" | "highlighter" | "link";

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: Exclude<MobileToolbarView, "main">;
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export interface EditorToolbarProps extends React.ComponentPropsWithoutRef<
  typeof Toolbar
> {
  isMobile: boolean;
}

export const EditorToolbar = forwardRef<HTMLDivElement, EditorToolbarProps>(
  ({ isMobile, ...toolbarProps }, ref) => {
    const [mobileView, setMobileView] = useState<MobileToolbarView>("main");

    useEffect(() => {
      if (!isMobile && mobileView !== "main") {
        setMobileView("main");
      }
    }, [isMobile, mobileView]);

    return (
      <Toolbar ref={ref} {...toolbarProps}>
        {mobileView === "main" ? (
          <MainToolbarContent
            onHighlighterClick={() => setMobileView("highlighter")}
            onLinkClick={() => setMobileView("link")}
            isMobile={isMobile}
          />
        ) : (
          <MobileToolbarContent
            type={mobileView}
            onBack={() => setMobileView("main")}
          />
        )}
      </Toolbar>
    );
  },
);

EditorToolbar.displayName = "EditorToolbar";
