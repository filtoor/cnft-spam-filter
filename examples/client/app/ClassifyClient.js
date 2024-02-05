"use client";
import { extractTokens, classify } from "cnft-spam-filter";
import { useState, useEffect } from "react";

export default function ClassifyClient() {
  const [assetId, setAssetId] = useState(
    "A1xhLVywcq6SeZnmRG1pUzoSWxVMpS6J5ShEbt3smQJr"
  );
  const [classification, setClassification] = useState("Loading...");

  const extractAndClassify = async (assetId) => {
    try {
      const tokens = await extractTokens(
        assetId,
        process.env.NEXT_PUBLIC_RPC_URL
      );

      const result = await classify([
        "not_containsEmoji",
        "not_proofLengthImpossible",
        "not_imageContainsUrl",
      ]);

      setClassification(result);
    } catch (e) {
      setClassification("error");
    }
  };

  useEffect(() => {
    setClassification("Loading...");
    extractAndClassify(assetId);
  }, [assetId]);

  return (
    <div className="flex flex-col gap-4 max-w-xl w-full px-8">
      <div className="flex w-full items-center gap-4">
        <span>assetId:</span>
        <input
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
      </div>

      <span>Classification: {classification}</span>
    </div>
  );
}
