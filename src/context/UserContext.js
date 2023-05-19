import { createContext } from "react";
import { useReducer } from "react";
import { useContext } from "react";

const initialState = {
  id: "",
  username: "",
  record: [0, 0],
  role: "",
  isAlive: true,
};

const UserReducer = (initialState, action) => {
  switch (action.type) {
    case "SET_USER_DATA":
      initialState = action.payload;
      return initialState;

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const UserStateContext = createContext();
const UserDispatchContext = createContext();

export function useUserState() {
  const context = useContext(UserStateContext);
  if (context === undefined) {
    throw new Error("useUserState must be used within a UserProvider");
  }

  return context;
}

export function useUserDispatch() {
  const context = useContext(UserDispatchContext);
  if (context === undefined) {
    throw new Error("useUserDispatch must be used within a UserProvider");
  }

  return context;
}

export const UserProvider = ({ children }) => {
  const [user, dispatch] = useReducer(UserReducer, initialState);

  return (
    <UserStateContext.Provider value={user}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
};
