import { addDoc, logsRef, serverTimestamp } from "../firebase";

export async function logEvent({ level = "info", action, details = {} }) {
  try {
    await addDoc(logsRef, {
      level,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log event:", error);
  }
}