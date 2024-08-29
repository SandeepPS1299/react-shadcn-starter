import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Item {
  id: string;
  content: string;
}

interface GroupedItems {
  [key: string]: string[];
}

interface ItemToGroup {
  dragged: string;
  target: string;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  onGroup: (id: string, action: 'ungroup') => void;
  isGrouped: boolean;
  groupedItems: string[];
  allItems: Item[];
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, onGroup, isGrouped, groupedItems, allItems }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: isGrouped });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: '1px solid #ccc',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: isGrouped ? '#e0e0e0' : 'white',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...(isGrouped ? {} : { ...attributes, ...listeners })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{children}</span>
        {isGrouped && (
          <Button variant="outline" size="sm" onClick={() => onGroup(id, 'ungroup')}>
            Ungroup
          </Button>
        )}
      </div>
      {isGrouped && groupedItems.length > 0 && (
        <div style={{ marginTop: '8px', marginLeft: '20px' }}>
          {groupedItems.map((subItemId) => {
            const subItem = allItems.find(item => item.id === subItemId);
            return <div key={subItemId}>{subItem ? subItem.content : subItemId}</div>;
          })}
        </div>
      )}
    </div>
  );
};

const DraggableList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([
    { id: '1', content: 'Item 1' },
    { id: '2', content: 'Item 2' },
    { id: '3', content: 'Item 3' },
    { id: '4', content: 'Item 4' },
  ]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [itemToGroup, setItemToGroup] = useState<ItemToGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      if (groupedItems[over.id as string]) {
        // If dropping onto an existing group
        setGroupedItems(prev => ({
          ...prev,
          [over.id as string]: [...prev[over.id as string], active.id as string]
        }));
        setItems(items => items.filter(item => item.id !== active.id));
      } else {
        // If dragging a non-grouped item onto another non-grouped item
        setItemToGroup({ dragged: active.id as string, target: over.id as string });
        setShowGroupDialog(true);
      }
    } else {
      // Reordering non-grouped items
      setItems(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleGroup = (action: 'group' | 'cancel') => {
    if (action === 'group') {
      setShowNameDialog(true);
    } else {
      setShowGroupDialog(false);
      setItemToGroup(null);
    }
  };

  const handleNameGroup = () => {
    if (itemToGroup) {
      const newGroupId = `group-${Date.now()}`;
      setGroupedItems((prev) => ({
        ...prev,
        [newGroupId]: [itemToGroup.dragged, itemToGroup.target],
      }));
      setItems((prevItems) => prevItems.filter((item) => ![itemToGroup.dragged, itemToGroup.target].includes(item.id)));
      setItems((prevItems) => [...prevItems, { id: newGroupId, content: groupName }]);
    }
    setShowNameDialog(false);
    setShowGroupDialog(false);
    setItemToGroup(null);
    setGroupName('');
  };

  const handleUngroup = (id: string) => {
    setGroupedItems((prev) => {
      const newGroupedItems = { ...prev };
      const ungroupedItems = newGroupedItems[id] || [];
      delete newGroupedItems[id];
      
      setItems((prevItems) => [
        ...prevItems.filter(item => item.id !== id),
        ...ungroupedItems.map((itemId) => ({ id: itemId, content: `Item ${itemId}` }))
      ]);
      
      return newGroupedItems;
    });
  };

  const visibleItems = items.filter((item) => 
    !Object.values(groupedItems).flat().includes(item.id)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {visibleItems.map((item) => (
          <SortableItem 
            key={item.id} 
            id={item.id}
            onGroup={handleUngroup}
            isGrouped={!!groupedItems[item.id]}
            groupedItems={groupedItems[item.id] || []}
            allItems={items}
          >
            {item.content}
          </SortableItem>
        ))}
      </SortableContext>

      <AlertDialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Group Items</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to group these items?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleGroup('cancel')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleGroup('group')}>Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Name Your Group</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter a name for your new group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNameDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleNameGroup}>Create Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
};

export default DraggableList;