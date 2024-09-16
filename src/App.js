import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  let eventSource; // Declare eventSource outside to access it in handleUnsubscribe
  let retryInterval = 1000; // Initial retry interval (1 second)
  let maxRetryInterval = 30000; // Maximum retry interval (30 seconds)


  useEffect(() => {
    const connect = () => {
      if (isSubscribed && userId) {
        eventSource = new EventSource(`http://localhost:8080/api/subscribe/${userId}`);
  
        eventSource.onmessage = (event) => {
          setNotifications((prev) => [...prev, event.data]);
        };
  
        eventSource.onerror = () => {
          console.log("Got error will retry connection");
          eventSource.close();
          setIsSubscribed(false);
          // Exponential backoff with jitter
          const jitter = Math.random() * 1000; // Add some randomness to avoid retry collisions
          retryInterval = Math.min(retryInterval * 2 + jitter, maxRetryInterval);
          setTimeout(connect, retryInterval); // Retry after the calculated interval
        };
      }
    };

    connect();      

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsSubscribed(false);
      }
    };
  }, [isSubscribed, userId]);

  const handleSubscribe = () => {
    setIsSubscribed(true);
  };

  const handleUnsubscribe = () => {
    if (eventSource) {
      eventSource.close();
    }
    setIsSubscribed(false);
    setNotifications([]); // Optionally clear existing notifications
    fetch(`http://localhost:8080/api/unsubscribe/${userId}`, {
      method: 'POST' // Or the appropriate method for your endpoint
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        // Handle successful unsubscribe on the server if needed
        console.log('Unsubscribed successfully');
      })
      .catch(error => {
        console.error('Error unsubscribing:', error);
        // Handle error, potentially show a message to the user
      });

  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />

      <button onClick={handleSubscribe} disabled={!userId || isSubscribed}>
        {isSubscribed ? 'Subscribed' : 'Subscribe'}
      </button>

      <button onClick={handleUnsubscribe} disabled={!isSubscribed}>
        Unsubscribe
      </button>

      <h2>Notifications:</h2>
      <ul>
        {notifications.map((notification, index) => (
          <li key={index}>{notification}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;