import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import { PendingChangesProvider } from "./context/PendingChangesContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store } from "./store/store";

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <SocketProvider>
            <PendingChangesProvider>
              <App />
            </PendingChangesProvider>
          </SocketProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Provider>,
)
