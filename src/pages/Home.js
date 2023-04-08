import axios from "axios";
import React, { useEffect, useState } from "react";
import userApi from "../api";

function Home() {
  const [data, setData] = useState([]);

  const fetchAllUsers = async () => {
    const fetchUsers = await axios
      .get(userApi)
      .then((res) => {
        const data = res.data;
        setData(data);
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  return (
    <div>
      <h1>Amogus</h1>
      {data.map((each) => (
        <p key={each.id}>
          {each.id} {each.name} {each.country}
        </p>
      ))}
    </div>
  );
}

export default Home;
