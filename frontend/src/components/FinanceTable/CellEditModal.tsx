import {
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import { FC } from 'react';

interface Props {
  isOpen: boolean;
  value: number;
  onChange: (v: number) => void;
  onSave: () => void;
  onCopyRow: () => void;
  onClose: () => void;
}

const CellEditModal: FC<Props> = ({
  isOpen,
  value,
  onChange,
  onSave,
  onCopyRow,
  onClose,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} isCentered size="xs">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>Edit value</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <HStack>
          <NumberInput
            value={value}
            onChange={(_, v) => onChange(v)}
            precision={2}
            step={10}
          >
            <NumberInputField autoFocus />
          </NumberInput>
          <IconButton
            aria-label="Copy to row"
            icon={<FiCopy />}
            title="Fill entire row"
            onClick={onCopyRow}
          />
          <Button ml="auto" onClick={onSave}>
            OK
          </Button>
        </HStack>
      </ModalBody>
    </ModalContent>
  </Modal>
);

export default CellEditModal;
