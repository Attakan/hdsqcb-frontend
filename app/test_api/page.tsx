"use client";

import React, { useEffect, useState } from 'react';

const API_BASE_URL = "https://attakan.pythonanywhere.com/";

const SQCBDetail = () => {
  const [sqcbData, setSqcbData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/sqcb`)
      .then((response) => response.json())
      .then((data) => {
        setSqcbData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching SQCB data:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div>Loading SQCB data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="sqcb-detail-container p-4">
      {sqcbData.length === 0 ? (
        <p>No SQCB details available.</p>
      ) : (
        sqcbData.map((sqcb) => (
          <div key={sqcb.sqcb_id} className="sqcb-detail mb-8 border p-4 rounded">
            <h2 className="text-xl font-bold mb-4">
              {sqcb.sqcb_id} - {sqcb.sqcb}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <p>
                <strong>Status:</strong> {sqcb.status}
              </p>
              <p>
                <strong>RQMR No.:</strong> {sqcb.rqmr_no}
              </p>
              <p>
                <strong>Plant:</strong> {sqcb.plant_id}
              </p>
              <p>
                <strong>HD SQ:</strong> {sqcb.hd_incharge}
              </p>
              <p>
                <strong>Supplier Code:</strong> {sqcb.supplier_code}
              </p>
              <p>
                <strong>Supplier Name:</strong> {sqcb.supplier_name}
              </p>
              <p>
                <strong>Feedback Date:</strong> {formatDate(sqcb.feedback_date)}
              </p>
              <p>
                <strong>Target Date:</strong> {formatDate(sqcb.target_date)}
              </p>
              <p>
                <strong>RMA No.:</strong> {sqcb.rma_no || '-'}
              </p>
              <p>
                <strong>Comments:</strong> {sqcb.comments || 'No comments'}
              </p>
            </div>

            {/* Parts Information */}
            <h3 className="text-lg font-bold mt-6 mb-2">Parts Information</h3>
            {sqcb.parts && sqcb.parts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="text-gray-700 w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Item</th>
                      <th className="border p-2">Part Number</th>
                      <th className="border p-2">Part Name</th>
                      <th className="border p-2">Notification</th>
                      <th className="border p-2">Qty</th>
                      <th className="border p-2">Pictures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqcb.parts.map((part, index) => (
                      <tr key={index}>
                        <td className="border p-2">{part.item_number}</td>
                        <td className="border p-2">{part.part_number}</td>
                        <td className="border p-2">{part.part_name}</td>
                        <td className="border p-2">{part.notification_number}</td>
                        <td className="border p-2">{part.qty}</td>
                        <td className="border p-2">
                          {part.pictures &&
                            part.pictures.map((picture, idx) => (
                              <a
                                key={idx}
                                href={picture.picture_address}
                                className="text-blue-500 hover:text-blue-700 mr-2"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {picture.picture_name}
                              </a>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No parts information available</p>
            )}

            {/* Attachments */}
            <h3 className="text-lg font-bold mt-6 mb-2">Attachments</h3>
            {sqcb.attachments && sqcb.attachments.length > 0 ? (
              <ul className="list-disc pl-5">
                {sqcb.attachments.map((attachment, idx) => (
                  <li key={idx} className="mb-1">
                    <a
                      href={attachment.attachment_address}
                      className="text-blue-500 hover:text-blue-700"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {attachment.attachment_name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No attachments available</p>
            )}

            <div className="created-modified-info mt-4 text-sm text-gray-600">
              <p>
                <strong>Created By:</strong> {sqcb.created_by}
              </p>
              <p>
                <strong>Modified By:</strong> {sqcb.modified_by}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SQCBDetail;
