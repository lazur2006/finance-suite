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
import { FC, useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  value: number;                // current numeric cell value
  onChange: (v: number) => void; // live change callback (only when parseable)
  onSave: () => void;
  onCopyRow: () => void;
  onClose: () => void;
}

/**
 * Professional-looking numeric editor that:
 *  • allows interim inputs like ".", ",", "-."
 *  • accepts both dot and comma as decimal separator
 *  • shows subtle styling that adapts to light / dark mode
 */
const CellEditModal: FC<Props> = ({
  isOpen,
  value,
  onChange,
  onSave,
  onCopyRow,
  onClose,
}) => {
  /* keep the raw string the user types */
  const [raw, setRaw] = useState("");

  /* initialise when dialog opens */
  useEffect(() => {
    if (isOpen) setRaw(value.toString());
  }, [isOpen, value]);

  /* helpers ---------------------------------------------------------------- */
  const tryParse = (txt: string): number | null => {
    // turn "," into "." for parseFloat, trim spaces
    const normalised = txt.replace(",", ".").trim();
    const num = parseFloat(normalised);
    return isFinite(num) ? num : null;
  };

  const handleInput = (txt: string) => {
    setRaw(txt);
    const parsed = tryParse(txt);
    if (parsed !== null) onChange(parsed);
  };

  /* theming */
  const borderCol = useColorModeValue("gray.300", "gray.600");
  const bgCol     = useColorModeValue("white", "gray.700");

  /* ----------------------------------------------------------------------- */
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW="sm" bg={bgCol}>
        <ModalHeader>Edit value</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input
            value={raw}
            onChange={(e) => handleInput(e.target.value)}
            fontSize="xl"
            textAlign="right"
            borderColor={borderCol}
            placeholder="Enter number"
            _focusVisible={{ borderColor: "blue.400" }}
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
