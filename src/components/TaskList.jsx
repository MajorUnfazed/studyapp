import React from 'react';

export default function TaskList() {
  // Placeholder for task management logic
  const tasks = [
    { id: 1, text: 'Design the new UI', completed: true },
    { id: 2, text: 'Implement Tailwind CSS', completed: true },
    { id: 3, text: 'Create TaskList component', completed: false },
    { id: 4, text: 'Add responsive design', completed: false },
  ];

  return (
    <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md max-w-lg mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Task List</h2>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center">
            <input
              type="checkbox"
              checked={task.completed}
              readOnly
              className="h-5 w-5 rounded-sm border-light-border dark:border-dark-border text-light-accent dark:text-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent"
            />
            <span className={`ml-3 text-light-text dark:text-dark-text ${task.completed ? 'line-through text-light-text-muted dark:text-dark-text-muted' : ''}`}>
              {task.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <input
          type="text"
          placeholder="Add a new task"
          className="form-input w-full rounded-md bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:border-light-accent dark:focus:border-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent"
        />
      </div>
    </div>
  );
}
