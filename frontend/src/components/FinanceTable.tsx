import {
  ActionBar,
  Button,
  Checkbox,
  IconButton,
  Kbd,
  Pagination,
  Portal,
  Stack,
  Table,
} from '@chakra-ui/react';
import { useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface Item {
  id: number;
  name: string;
  category: string;
  price: number;
}

const initialItems: Item[] = [
  { id: 1, name: 'Laptop', category: 'Electronics', price: 999.99 },
  { id: 2, name: 'Coffee Maker', category: 'Home Appliances', price: 49.99 },
  { id: 3, name: 'Desk Chair', category: 'Furniture', price: 150.0 },
  { id: 4, name: 'Smartphone', category: 'Electronics', price: 799.99 },
  { id: 5, name: 'Headphones', category: 'Accessories', price: 199.99 },
  { id: 6, name: 'Notebook', category: 'Office', price: 3.99 },
  { id: 7, name: 'Pen', category: 'Office', price: 1.99 },
  { id: 8, name: 'Monitor', category: 'Electronics', price: 249.99 },
  { id: 9, name: 'Keyboard', category: 'Electronics', price: 89.99 },
  { id: 10, name: 'Mouse', category: 'Electronics', price: 59.99 },
];

const PAGE_SIZE = 5;

const FinanceTable = () => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<number[]>([]);

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasSelection = selection.length > 0;
  const indeterminate =
    hasSelection && selection.length < paginated.length;

  const toggleRow = (id: number, checked: boolean) => {
    setSelection((prev) =>
      checked ? [...prev, id] : prev.filter((s) => s !== id)
    );
  };

  const toggleAll = (checked: boolean) => {
    setSelection(checked ? paginated.map((i) => i.id) : []);
  };

  const deleteRows = () => {
    setItems((prev) => prev.filter((i) => !selection.includes(i.id)));
    setSelection([]);
  };

  return (
    <Stack width="full" gap={4} p={2}>
      <Table.ScrollArea borderWidth="1px" rounded="md" height="240px">
        <Table.Root size="sm" stickyHeader showColumnBorder>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader w="6">
                <Checkbox.Root
                  size="sm"
                  aria-label="Select all rows"
                  checked={indeterminate ? "indeterminate" : selection.length > 0}
                  onCheckedChange={(c) => toggleAll(!!c.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>
              <Table.ColumnHeader>Product</Table.ColumnHeader>
              <Table.ColumnHeader>Category</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Price</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginated.map((item) => (
              <Table.Row
                key={item.id}
                data-selected={selection.includes(item.id) ? '' : undefined}
              >
                <Table.Cell>
                  <Checkbox.Root
                    size="sm"
                    aria-label="Select row"
                    checked={selection.includes(item.id)}
                    onCheckedChange={(c) => toggleRow(item.id, !!c.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                </Table.Cell>
                <Table.Cell>{item.name}</Table.Cell>
                <Table.Cell>{item.category}</Table.Cell>
                <Table.Cell textAlign="end">{item.price}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>

      <Pagination.Root
        count={items.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      >
        <ButtonGroup variant="ghost" size="sm" wrap="wrap">
          <Pagination.PrevTrigger asChild>
            <IconButton aria-label="Prev">
              <LuChevronLeft />
            </IconButton>
          </Pagination.PrevTrigger>

          <Pagination.Items
            render={(p) => (
              <IconButton variant={{ base: 'ghost', _selected: 'outline' }}>
                {p.value}
              </IconButton>
            )}
          />

          <Pagination.NextTrigger asChild>
            <IconButton aria-label="Next">
              <LuChevronRight />
            </IconButton>
          </Pagination.NextTrigger>
        </ButtonGroup>
      </Pagination.Root>

      <ActionBar.Root open={hasSelection}>
        <Portal>
          <ActionBar.Positioner>
            <ActionBar.Content>
              <ActionBar.SelectionTrigger>
                {selection.length} selected
              </ActionBar.SelectionTrigger>
              <ActionBar.Separator />
              <Button variant="outline" size="sm" onClick={deleteRows}>
                Delete <Kbd>⌫</Kbd>
              </Button>
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Portal>
      </ActionBar.Root>
    </Stack>
  );
};

export default FinanceTable;
