import { Draggable, Droppable } from '@hello-pangea/dnd';

export const DraggableEvent = ({ event, index, children }) => {
  return (
    <Draggable draggableId={event.cr4a1_agenda_kairosid} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.7 : 1,
            cursor: 'grab',
            userSelect: 'none',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
            transition: snapshot.isDragging ? 'none' : provided.draggableProps.style?.transition,
          }}
        >
          {children}
        </div>
      )}
    </Draggable>
  );
};

export const DroppableDay = ({ dateStr, children, isToday, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <Droppable droppableId={dateStr}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`calendar-day-card ${snapshot.isDraggingOver ? 'drop-over' : ''} ${isToday ? 'today' : ''}`}
          style={{
            overflow: 'hidden',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            opacity: 1,
          }}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};
