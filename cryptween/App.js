import OvalLoader from "@components/_helpers/OvalLoader";
import ContextMenuHub from "@components/context/ContextMenuHub";
import activityService from "@services/activityService";
import autoLoginService from "@services/autoLoginService.js";
import conversationService from "@services/conversationsService";
import globalConstants from "@helpers/constants";
import messagesService from "@services/messagesService";
import navigateTo from "@utils/navigation/navigate_to";
import removeAndNavigateSubLink from "@utils/navigation/remove_prefix";
import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { getIsMobileView, setIsMobileView } from "@store/values/IsMobileView";
import { getIsTabletView, setIsTabletView } from "@store/values/IsTabletView";
import { history } from "@helpers/history";
import { selectIsClicked, setClicked } from "@store/values/ContextMenu";
import { updateNetworkState } from "@store/values/NetworkState";
import { useDispatch, useSelector } from "react-redux";

import SMain from "@skeletons/SMain";
import SPageLoader from "@skeletons/SPageLoader";

import "@styles/GlobalParam.css";
import getCredentials from "../../renderer/hooks/useLogin";
import usersService from "../src/services/usersService";

const Main = lazy(() => import("@components/Main"));
const AuthorizationHub = lazy(() =>
  import("@components/auth/AuthorizationHub")
);

export default function App() {
  const [isLoader, setIsLoader] = useState(false);

  const dispatch = useDispatch();
  history.location = useLocation();
  history.navigate = useNavigate();

  const isContextClicked = useSelector(selectIsClicked);

  /*const isMobileView = useSelector(getIsMobileView);
  const isMobileViewRef = useRef(isMobileView);

  const isTabletView = useSelector(getIsTabletView);
  const isTabletViewRef = useRef(isTabletView);*/

  useEffect(() => {
   /* window.addEventListener("offline", () =>
      dispatch(updateNetworkState(false))
    );
    window.addEventListener("online", () => dispatch(updateNetworkState(true)));
    window.addEventListener("resize", () => {
      const isMobileView = window.innerWidth <= globalConstants.mobileViewWidth;
      if (isMobileView !== isMobileViewRef.current) {
        isMobileView === true &&
          removeAndNavigateSubLink(
            history.location.pathname + history.location.hash,
            "/profile"
          );
        isMobileViewRef.current = isMobileView;
        dispatch(setIsMobileView(isMobileView));
      }

      const isTabletView =
        window.innerWidth <= globalConstants.tabletViewWidth &&
        window.innerWidth > globalConstants.mobileViewWidth;
      if (isTabletView !== isTabletViewRef.current) {
        isTabletView === true &&
          removeAndNavigateSubLink(
            history.location.pathname + history.location.hash,
            "/profile"
          );
        isTabletViewRef.current = isTabletView;
        dispatch(setIsTabletView(isTabletView));
      }
      dispatch(setClicked(false));
    });

    dispatch(
      setIsMobileView(window.innerWidth <= globalConstants.mobileViewWidth)
    );
    dispatch(
      setIsTabletView(
        window.innerWidth <= globalConstants.tabletViewWidth &&
          window.innerWidth > globalConstants.mobileViewWidth
      )
    );*/

    const token = localStorage.getItem("sessionId");
        if (token && token !== "undefined") {
      const { pathname, hash } = history.location;
      const path = hash ? pathname + hash : "/";
      navigateTo(path);
    } else {
      localStorage.removeItem("sessionId");
      getCredentials().then((data) => {
        console.log("cred cred cred");
        console.dir(data);

        usersService.login({login:data.user, password: data.pass}).then((resultLogin) => {
          console.dir(resultLogin);

        });
      });
     // navigateTo("/authorization");
    }
  }, []);

 /* useEffect(() => {
    const handleClick = () => dispatch(setClicked(false));
    document.addEventListener("click", handleClick);
    document.addEventListener("popstate", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("popstate", handleClick);
    };
  }, []);*/

  return (
<Suspense
      fallback={localStorage.getItem("sessionId") ? <SMain /> : <SPageLoader />}
    >
      {isContextClicked ? (
        <ContextMenuHub key={"ContextMenu"} id={"ContextMenu"} />
      ) : null}
      <AnimatePresence initial={false} mode="wait">
        <Routes location={history.location}>
          <Route path="/authorization" element={<AuthorizationHub />} />
          <Route path="/*" element={<Main />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
