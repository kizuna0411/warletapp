import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return { user };
}
export default useAuth;
