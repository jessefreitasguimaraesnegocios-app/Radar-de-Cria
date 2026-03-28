import { useCallback, useEffect, useState } from 'react';
import {
  loadMarksFromStorage,
  saveMarksToStorage,
  type PlaceMarkColor,
} from '../lib/placeMarks';

export function usePlaceMarks() {
  const [marks, setMarks] = useState<Record<string, PlaceMarkColor>>({});

  useEffect(() => {
    setMarks(loadMarksFromStorage());
  }, []);

  useEffect(() => {
    saveMarksToStorage(marks);
  }, [marks]);

  const setMark = useCallback((markKey: string, color: PlaceMarkColor | null) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (color == null) {
        delete next[markKey];
      } else {
        next[markKey] = color;
      }
      return next;
    });
  }, []);

  return { marks, setMark };
}
