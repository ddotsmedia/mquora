import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';

const LIMIT = 400;

// Answer text truncated to LIMIT characters with an inline read-more toggle.
export function AnswerBody({ body }: { body: string }) {
  const [open, setOpen] = useState(false);
  const long = body.length > LIMIT;
  const shown = long && !open ? `${body.slice(0, LIMIT).trimEnd()}…` : body;
  return (
    <>
      <Text className="text-gray-700 dark:text-gray-300">{shown}</Text>
      {long && (
        <TouchableOpacity onPress={() => setOpen(!open)} className="mt-1">
          <Text className="text-[#1F6B45] font-semibold">{open ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
