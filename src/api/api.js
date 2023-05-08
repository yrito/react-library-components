import getBrowserFingerprint from "get-browser-fingerprint";
import getUniqueId from "./uuid.js";
import { default as EventEmitter } from "../event/eventEmitter.js";
import { default as reduxStore } from "../store/store.js";
import { updateState } from "../store/ConnectState.js";

class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.socket = null;
    this.responsesPromises = {};
    this.onMessageStatusListener = null;
    this.onUserActivityListener = null;
  }

  async connect() {
    this.socket = new WebSocket(this.baseUrl);

    this.socket.onopen = () => {
      console.log("[socket.open]");
      EventEmitter.emit("onConnect");
      reduxStore.dispatch(updateState(true));
    };

    this.socket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      console.log("[socket.message]", message);

      if (message.message?.last_activity) {
        if (this.onUserActivityListener) {
          this.onUserActivityListener(message.message?.last_activity);
        }
        return;
      }

      if (message.message?.message_read) {
        if (this.onMessageStatusListener) {
          this.onMessageStatusListener(message.message.message_read);
        }
        return;
      }

      if (message.message) {
        if (this.onMessageListener) {
          this.onMessageListener(message.message);
        }
        return;
      }

      if (message.ask) {
        const mid = message.ask.mid;
        this.responsesPromises[mid](message.ask);
        delete this.responsesPromises[mid];
        return;
      }
      const response = message.response;
      if (response) {
        const responseId = response.id;
        const { resolve, reject, resObjKey } =
          this.responsesPromises[responseId];
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response[resObjKey]);
        }
        delete this.responsesPromises[responseId];
      }
    };

    this.socket.onclose = () => {
      console.log("[socket.close]");
      reduxStore.dispatch(updateState(false));

      const reConnect = () => {
        if (navigator.onLine && document.visibilityState === "visible") {
          this.connect();
          window.removeEventListener("online", reConnect);
          document.removeEventListener("visibilitychange", reConnect);
        }
      };

      if (navigator.onLine && document.visibilityState === "visible") {
        this.connect();
      } else {
        window.addEventListener("online", reConnect);
        document.addEventListener("visibilitychange", reConnect);
      }
    };
  }

  async sendPromise(req, key) {
    return new Promise((resolve, reject) => {
      this.socket.send(JSON.stringify(req));
      console.log("[socket.send]", req);
      this.responsesPromises[req.request.id] = {
        resolve,
        reject,
        resObjKey: key,
      };
    });
  }

  async userLogin(data) {
    const requestData = {
      request: {
        user_login: data.token
          ? {
              token: data.token,
              deviceId: getBrowserFingerprint(true),
            }
          : {
              login: data.ulogin,
              password: data.pass,
              deviceId: getBrowserFingerprint(true),
            },
        id: getUniqueId("userLogin"),
      },
    };
    const resObjKey = "token";
    return this.sendPromise(requestData, resObjKey);
  }

  async userCreate(data) {
    const requestData = {
      request: {
        user_create: {
          login: data.ulogin,
          password: data.pass,
        },
        id: getUniqueId("userCreate"),
      },
    };
    const resObjKey = "user";
    return this.sendPromise(requestData, resObjKey);
  }

  async userLogout() {
    const requestData = {
      request: {
        user_logout: {},
        id: getUniqueId("userLogout"),
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async userDelete() {
    //only use in app
    const requestData = {
      request: {
        user_delete: {},
        id: getUniqueId("userDelete"),
      },
    };
    const resObjKey = "success";
    localStorage.removeItem("sessionId");
    return this.sendPromise(requestData, resObjKey);
  }

  async userSearch(data) {
    const requestData = {
      request: {
        user_search: {
          login: data.login,
          ignore_ids: data.ignore_ids,
        },
        id: getUniqueId("userSearch"),
      },
    };
    if (data.limit) requestData.request.user_search["limit"] = data.limit;
    if (data.updated_at)
      requestData.request.user_search["updated_at"] = data.updated_at;
    const resObjKey = "users";
    return this.sendPromise(requestData, resObjKey);
  }

  async getParticipantsByCids(data) {
    const requestData = {
      request: {
        getParticipantsByCids: {
          cids: data,
        },
        id: getUniqueId("getParticipantsByCids"),
      },
    };
    const resObjKey = "users";
    return this.sendPromise(requestData, resObjKey);
  }

  async createUploadUrlForFiles(data) {
    const requestData = {
      request: {
        create_files: data.files,
        id: getUniqueId("createUploadUrlForFile"),
      },
    };
    const resObjKey = "files";
    return this.sendPromise(requestData, resObjKey);
  }

  async getDownloadUrlForFiles(data) {
    const requestData = {
      request: {
        get_file_urls: {
          file_ids: data.file_ids,
        },
        id: getUniqueId("getDownloadUrlForFiles"),
      },
    };
    const resObjKey = "file_urls";
    return this.sendPromise(requestData, resObjKey);
  }

  async messageCreate(data) {
    return new Promise((resolve, reject) => {
      const requestData = {
        message: {
          id: data.mid,
          body: data.text,
          cid: data.chatId,
          attachments: data.attachments,
        },
      };
      this.responsesPromises[requestData.message.id] = resolve;
      this.socket.send(JSON.stringify(requestData));
      console.log("[socket.send]", requestData);
    });
  }

  async messageEdit(data) {
    //===============to do
    const requestData = {
      request: {
        message_edit: {
          id: "include_2",
          body: "updated message body (UPDATED)",
        },
        id: Math.floor(Math.random() * 101),
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async messageList(data) {
    const requestData = {
      request: {
        message_list: {
          cid: data.cid,
        },
        id: getUniqueId("messageList"),
      },
    };
    if (data.limit) requestData.request.message_list["limit"] = data.limit;

    const resObjKey = "messages";
    return this.sendPromise(requestData, resObjKey);
  }

  async markConversationAsRead(data) {
    const requestData = {
      request: {
        message_read: {
          cid: data.cid,
        },
        id: getUniqueId("markConversationAsRead"),
      },
    };

    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async messageDelete(data) {
    //===============to do
    const requestData = {
      request: {
        message_delete: {
          cid: "currentConversationId",
          type: "all",
          ids: ["ids"],
          from: "userId[0]",
        },
        id: Math.floor(Math.random() * 101),
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async subscribeToUserActivity(data) {
    const requestData = {
      request: {
        user_last_activity_subscribe: {
          id: data,
        },
        id: getUniqueId("subscribeToUserActivity"),
      },
    };
    const resObjKey = "last_activity";
    return this.sendPromise(requestData, resObjKey);
  }

  async unsubscribeFromUserActivity(data) {
    const requestData = {
      request: {
        user_last_activity_unsubscribe: {},
        id: getUniqueId("unsubscribeFromUserActivity"),
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async statusRead(data) {
    //===============to do
    const requestData = {
      read: {
        id: "xyz",
        type: "start",
        mid: "message1234",
        cid: "currentConversationId",
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async statusDelivered(data) {
    //===============to do
    const requestData = {
      delivered: {
        id: "xyz",
        type: "start",
        mid: "message1234",
        cid: "currentConversationId",
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async statusTyping(data) {
    //===============to do
    const requestData = {
      typing: {
        id: "xyz",
        type: "start",
        cid: "currentConversationId",
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async conversationCreate(data) {
    const requestData = {
      request: {
        conversation_create: {
          name: data.name,
          description: data.description,
          type: data.type,
          opponent_id: data.opponent_id,
          participants: data.participants,
        },
        id: getUniqueId("conversationCreate"),
      },
    };
    const resObjKey = "conversation";
    return this.sendPromise(requestData, resObjKey);
  }

  async conversationUpdate(data) {
    //===============to do
    const requestData = {
      request: {
        conversation_update: {
          id: "currentConversationId",
          description: "test213",
          participants: {
            add: ["userId[2]"],
            remove: ["userId[2]"],
          },
        },
        id: Math.floor(Math.random() * 101),
      },
    };
    const resObjKey = "conversation";
    return this.sendPromise(requestData, resObjKey);
  }

  async conversationList(data) {
    const requestData = {
      request: {
        conversation_list: {},
        id: getUniqueId("conversationList"),
      },
    };
    if (data.limit) requestData.request.conversation_list["limit"] = data.limit;
    if (data.updated_at)
      requestData.request.conversation_list["updated_at"]["gt"] =
        data.updated_at;
    const resObjKey = "conversations";
    return this.sendPromise(requestData, resObjKey);
  }

  async conversationDelete(data) {
    const requestData = {
      request: {
        conversation_delete: {
          id: data.cid,
        },
        id: getUniqueId("conversationDelete"),
      },
    };
    const resObjKey = "success";
    return this.sendPromise(requestData, resObjKey);
  }

  async pushSubscriptionCreate(data) {
    const requestData = {
      request: {
        push_subscription_create: {
          platform: "web",
          web_endpoint: data.web_endpoint,
          web_key_auth: data.web_key_auth,
          web_key_p256dh: data.web_key_p256dh,
          device_udid: getBrowserFingerprint(true)?.toString(),
        },
        id: getUniqueId("pushSubscriptionCreate"),
      },
    };

    const resObjKey = "user";
    return this.sendPromise(requestData, resObjKey);
  }

  async pushSubscriptionDelete(data) {
    const requestData = {
      request: {
        push_subscription_delete: {
          device_udid: getBrowserFingerprint(true)?.toString(),
        },
        id: getUniqueId("pushSubscriptionDelete"),
      },
    };

    const resObjKey = "user";
    return this.sendPromise(requestData, resObjKey);
  }
}

function getUserLogin() {
  let token = localStorage.getItem("sessionId");
  token = token ? token.split(".")[1] : token;
  return token ? token.split(0, 6) : token;
}

const api = new Api(process.env.REACT_APP_SOCKET_CONNECT);
api.connect();

export { getUserLogin };
export default api;
