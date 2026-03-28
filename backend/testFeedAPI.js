import axios from 'axios';

const testAPI = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/complaints/feed?sort=latest&category=All');
    console.log(`STATUS:${res.status}`);
    console.log(`COUNT:${res.data.length}`);
    console.log("FIRST_TITLE:", res.data[0]?.title);
  } catch (err) {
    console.error(`ERROR:${err.message}`);
  }
};

testAPI();
