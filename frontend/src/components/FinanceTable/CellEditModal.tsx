import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Button,
  HStack,
  Input,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React, {
  FC,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface Props {
  isOpen: boolean;
  value: number;                 // current numeric cell value
  onChange: (v: number) => void; // live-change callback (only when parseable)
  onSave: () => void;
  onCopyRow: () => void;
  onClose: () => void;
}

/**
 * Numeric editor
 * – opens with an **empty** field → first keystroke inserts new number
 * – accepts “.” or “,” for decimals
 * – ENTER saves · ESC closes
 */
const CellEditModal: FC<Props> = ({
  isOpen,
  value,
  onChange,
  onSave,
  onCopyRow,
  onClose,
}) => {
  /* raw text the user is typing */
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* when the modal opens: clear the field */
  useEffect(() => {
    if (isOpen) setRaw(""); // ←─ CLEAR CONTENT
  }, [isOpen]);

  /* focus the input and (just in case) select any text that might be there */
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.select();
  }, [isOpen]);

  /* helpers -------------------------------------------------------- */
  const tryParse = (txt: string): number | null => {
    const normalised = txt.replace(",", ".").trim();
    if (["", ".", "-."].includes(normalised)) return null;
    const n = Number.parseFloat(normalised);
    return Number.isFinite(n) ? n : null;
  };

  const handleInput = (txt: string) => {
    setRaw(txt);
    const parsed = tryParse(txt);
    if (parsed !== null) onChange(parsed);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tryParse(raw) !== null) {
      e.preventDefault();
      onSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  /* theming -------------------------------------------------------- */
  const borderCol = useColorModeValue("gray.300", "gray.600");
  const bgCol     = useColorModeValue("white", "gray.700");

  /* render --------------------------------------------------------- */
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      initialFocusRef={inputRef}
    >
      <ModalOverlay />
      <ModalContent maxW="sm" bg={bgCol}>
        <ModalHeader>Edit value</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input
            ref={inputRef}
            value={raw}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKey}
            /* clicking back into the field re-selects any text */
            onFocus={(e) => e.currentTarget.select()}
            fontSize="xl"
            textAlign="right"
            borderColor={borderCol}
            placeholder={value.toString()}   /* shows former number as hint */
            _focusVisible={{ borderColor: "blue.400" }}
            autoComplete="off"
          />
          <Text mt={2} fontSize="sm" color="gray.500">
            Use “.” or “,” for decimals – both are accepted.
          </Text>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onCopyRow}>
              Copy value ⤵︎ row
            </Button>
            <Button
              colorScheme="blue"
              onClick={onSave}
              isDisabled={tryParse(raw) === null}
            >
              Save
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CellEditModal;
