import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function streakKey(userId) {
  return `bulkyapp_streak_${userId}`;
}

// Whole-day difference between two dates (ignores time-of-day)
function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dateB - dateA) / msPerDay);
}

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(null);

  // Load + auto-reset streak when the account changes or a day was missed
  useEffect(() => {
    if (!user) {
      setStreak(0);
      setLastActiveDate(null);
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem(streakKey(user.id)));
      if (stored?.lastActiveDate) {
        const gap = daysBetween(new Date(stored.lastActiveDate), new Date());
        if (gap > 1) {
          // Missed a day (or more) -> streak resets to 0
          setStreak(0);
          setLastActiveDate(null);
          localStorage.setItem(streakKey(user.id), JSON.stringify({ count: 0, lastActiveDate: null }));
        } else {
          setStreak(stored.count || 0);
          setLastActiveDate(stored.lastActiveDate);
        }
      } else {
        setStreak(0);
        setLastActiveDate(null);
      }
    } catch {
      setStreak(0);
      setLastActiveDate(null);
    }
  }, [user]);

  // Call this whenever the user completes a "counted" activity for today
  const recordActivityToday = useCallback(() => {
    if (!user) return;
    const today = new Date();

    setStreak((prevStreak) => {
      const prevDate = lastActiveDate ? new Date(lastActiveDate) : null;
      let nextCount;

      if (!prevDate) {
        nextCount = 1;
      } else {
        const gap = daysBetween(prevDate, today);
        if (gap === 0) {
          nextCount = prevStreak; // already counted today
        } else if (gap === 1) {
          nextCount = prevStreak + 1; // consecutive day
        } else {
          nextCount = 1; // missed one or more days -> restart
        }
      }

      localStorage.setItem(
        streakKey(user.id),
        JSON.stringify({ count: nextCount, lastActiveDate: today.toISOString() })
      );
      setLastActiveDate(today.toISOString());
      return nextCount;
    });
  }, [user, lastActiveDate]);

  return { streak, recordActivityToday };
}
