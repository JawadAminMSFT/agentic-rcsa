import React from "react";

const InterviewAgent = () => {
  return (
    <iframe
      src="/interview-agent/chat.html"
      title="Interview Agent"
      style={{ width: "100%", height: "100%", border: "none", position: "absolute", left: 0}}
    //   style={{
    //     position: "fixed",
    //     top: 0,
    //     left: 0,
    //     width: "100%",
    //     height: "100%",
    //     border: "none",
    //     margin: "0px 0 0 0",
    //     padding: 0,
    //     background: "#f8fafd",
    //   }}
      allow="camera; microphone; clipboard-write"
    />
  );
};

export default InterviewAgent;
