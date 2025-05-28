export const initialState = {
  message: "",
  history: [],
  loading: false,
  streaming: true,
  currentStreamingMessage: ""
};

export const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        history: [...state.history, action.payload],
        message: ""
      };
    case 'ADD_ASSISTANT_MESSAGE':
      return { ...state, history: [...state.history, action.payload] };
    case 'UPDATE_STREAMING_MESSAGE':
      return {
        ...state,
        history: state.history.map(msg =>
          msg.id === action.payload.id ? { ...msg, content: action.payload.content } : msg
        )
      };
    case 'SET_STREAMING_STATUS':
      return {
        ...state,
        history: state.history.map(msg =>
          msg.id === action.payload.id ? { ...msg, streaming: action.payload.streaming } : msg
        )
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_STREAMING':
      return { ...state, streaming: action.payload };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'CLEAR_CHAT':
      return { ...state, history: [], currentStreamingMessage: "" };
    default:
      return state;
  }
};