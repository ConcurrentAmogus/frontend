// Backend url
const URL = "http://localhost:8081"; // *development
// const URL = "https://api-amogus-live-wvluze4gba-as.a.run.app"; // *production

const API_ENDPOINT = URL + "/api";
const WS_ENDPOINT = URL + "/ws-endpoint";

const USER_API = API_ENDPOINT + "/user";
const ROOM_API = API_ENDPOINT + "/room";
const TIMER_API = API_ENDPOINT + "/timer";

export { WS_ENDPOINT, USER_API, ROOM_API, TIMER_API };
