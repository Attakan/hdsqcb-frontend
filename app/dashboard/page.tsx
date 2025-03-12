"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Save, Menu, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { addDays, format, parse } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Set base URL to localhost
const API_BASE_URL = typeof window !== 'undefined' 
  ? "https://attakan.pythonanywhere.com/" 
  : process.env.NEXT_PUBLIC_API_URL || "https://attakan.pythonanywhere.com/";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8",
  "#A4DE02", "#FF7300", "#73C0DE", "#F5A623", "#50E3C2",
  "#C500FF", "#F74D4D", "#BDB76B", "#66CDAA", "#CD5C5C",
  "#4682B4", "#FFD700", "#7FFFD4", "#9ACD32", "#6A5ACD",
  "#DB7093", "#FFA07A", "#40E0D0", "#9B870C", "#D2B48C",
  // ... add more as needed
];

// Fetch the part name based on the part number and update the parts array
const fetchPartName = async (partNumber, index, updateParts) => {
  if (!partNumber) return;
  try {
    const response = await fetch(`${API_BASE_URL}/part/${partNumber}`);
    if (response.ok) {
      const data = await response.json();
      if (data.part_name) {
        // Use the provided updater function to update the parts array
        updateParts((prevParts) => {
          const updatedParts = [...prevParts];
          updatedParts[index].part_name = data.part_name;
          return updatedParts;
        });
      }
    } else {
      console.error(`Error fetching part name: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching part name:", error);
  }
};

/** 1) Helper: check if `modified` is within 6 days of today */
function isWithin6Days(dateStr) {
  if (!dateStr) return false;
  const modifiedDate = new Date(dateStr);
  if (isNaN(modifiedDate.getTime())) return false;
  
  const now = new Date();
  // Fix this line to use getTime() method
  const diffMs = now.getTime() - modifiedDate.getTime(); // milliseconds difference
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 6;
}

/** 2) Helper: check if rma_no is "null" or empty */
function isRmaNoNull(rmaNo) {
  if (rmaNo === null || rmaNo === undefined) return true;
  if (typeof rmaNo === "string" && rmaNo.trim() === "") return true;
  return false;
}

// Card component for displaying summary numbers and charts
function Card({ title, children }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {children}
    </div>
  );
}

/** Simple Table component */
function Table({ data }) {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            {headers.map((header, index) => (
              <th key={`header-${index}`} className="py-3 px-6 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm font-light">
          {data.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-b border-gray-200 hover:bg-gray-100"
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="py-3 px-6 text-left whitespace-nowrap"
                >
                  {row[header] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Helper to format date into yyyy-MM-dd */
const formatDate = (date) => format(date, "yyyy-MM-dd");

/** Simple Field component for display */
const Field = ({ label, value, isLink, children }) => (
  <div className="bg-white p-2 rounded">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {children ? (
      <div className="mt-1">{children}</div>
    ) : (
      <div className={`mt-1 ${isLink ? "text-blue-600 underline" : "text-gray-900"} break-words`}>
        {value !== undefined && value !== null ? value : "-"}
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                            PERMISSION MANAGEMENT                           */
/* -------------------------------------------------------------------------- */
const PermissionManagement = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    password_hash: "",
    name: "",
    surname: "",
    fullname: "",
    job_description: "",
    email: "",
    supplier_code: "",
    role: "",
  });

  // On mount, fetch all users
  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  /** Handle Edit button click */
  const handleEditClick = (user) => {
    setEditingUser(user.user_id);
    setEditForm({
      username: user.username || "",
      password_hash: user.password_hash || "",
      name: user.name || "",
      surname: user.surname || "",
      fullname: user.fullname || "",
      job_description: user.job_description || "",
      email: user.email || "",
      supplier_code: user.supplier_code || "",
      role: user.role || "",
    });
  };

  /** Handle inputs in the edit form */
  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  
  /** Save changes to user */
  const handleSave = () => {
    if (!editingUser) return;
    fetch(`${API_BASE_URL}/profile/${editingUser}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update user");
        return res.json();
      })
      .then(() => {
        // Update local list of users
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.user_id === editingUser ? { ...u, ...editForm } : u))
        );
        setEditingUser(null);
      })
      .catch((err) => console.error("Error updating user:", err));
  };

  /** Delete user */
  const handleDeleteClick = (user_id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    fetch(`${API_BASE_URL}/profile/${user_id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error);
          });
        }
        return res.json();
      })
      .then(() => {
        // Remove from local state
        setUsers((prevUsers) => prevUsers.filter((user) => user.user_id !== user_id));
      })
      .catch((err) => console.error("Error deleting user:", err));
  };

  const handleCancel = () => {
    setEditingUser(null);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow text-black">
      <h1 className="text-xl font-semibold mb-4">User Management</h1>

      {/* Main User Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border border-gray-300">User ID</th>
              <th className="p-2 border border-gray-300">Username</th>
              <th className="p-2 border border-gray-300">Password (Hash)</th>
              <th className="p-2 border border-gray-300">Full Name</th>
              <th className="p-2 border border-gray-300">Email</th>
              <th className="p-2 border border-gray-300">Supplier Code</th>
              <th className="p-2 border border-gray-300">Role</th>
              <th className="p-2 border border-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-300">{user.user_id}</td>
                <td className="p-2 border border-gray-300">{user.username || ""}</td>
                <td className="p-2 border border-gray-300">{user.password_hash || ""}</td>
                <td className="p-2 border border-gray-300">{user.fullname || ""}</td>
                <td className="p-2 border border-gray-300">{user.email || ""}</td>
                <td className="p-2 border border-gray-300">{user.supplier_code || ""}</td>
                <td className="p-2 border border-gray-300">{user.role || ""}</td>
                <td className="p-2 border border-gray-300 space-x-2">
                  <Button
                    onClick={() => handleEditClick(user)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteClick(user.user_id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Form */}
      {editingUser && (
        <div className="bg-gray-50 p-4 rounded shadow mt-4">
          <h2 className="text-lg font-bold mb-4">Edit User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={editForm.username || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password_hash">Password (Hash)</Label>
              <Input
                id="password_hash"
                name="password_hash"
                value={editForm.password_hash || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                name="fullname"
                value={editForm.fullname || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={editForm.email || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="supplier_code">Supplier Code</Label>
              <Input
                id="supplier_code"
                name="supplier_code"
                value={editForm.supplier_code || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                name="role"
                value={editForm.role || ""}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="job_description">Job Description</Label>
              <Input
                id="job_description"
                name="job_description"
                value={editForm.job_description || ""}
                onChange={handleInputChange}
                className="mt-1 w-full"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-700 text-white">
              Save Changes
            </Button>
            <Button onClick={handleCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         PROFILE SETTINGS COMPONENT                         */
/* -------------------------------------------------------------------------- */
const ProfileSettings = () => {
  const [profile, setProfile] = useState({
    user_id: "",
    username: "",
    password_hash: "",
    name: "",
    surname: "",
    fullname: "",
    job_description: "",
    email: "",
    supplier_code: "",
    role: "",
    department: "",
    preferredLanguage: "English",
    notificationPreferences: {
      email: true,
      push: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          throw new Error("No user found in localStorage. Make sure you are logged in.");
        }
        const userData = JSON.parse(storedUser);
        if (!userData.user_id) {
          throw new Error("No user_id found in localStorage. Check your login flow.");
        }
        const response = await fetch(`${API_BASE_URL}/profile/${userData.user_id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user. Status: ${response.status}`);
        }
        const data = await response.json();
        setProfile((prev) => ({
          ...prev,
          user_id: data.user_id || "",
          username: data.username || "",
          password_hash: data.password_hash || "",
          name: data.name || "",
          surname: data.surname || "",
          fullname: data.fullname || "",
          job_description: data.job_description || "",
          email: data.email || "",
          supplier_code: data.supplier_code || "",
          role: data.role || "",
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  /** Handle field input changes */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value || "" }));
  };

  /** Handle checkbox changes */
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setProfile((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [name]: checked,
      },
    }));
  };

  /** Submit updated profile */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${profile.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username || "",
          password_hash: profile.password_hash || "",
          name: profile.name || "",
          surname: profile.surname || "",
          fullname: profile.fullname || "",
          job_description: profile.job_description || "",
          email: profile.email || "",
          supplier_code: profile.supplier_code || "",
          role: profile.role || "",
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update profile");
      }
      alert("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  /** Handle profile deletion */
  const handleDeleteProfile = async () => {
    if (!window.confirm("Are you sure you want to delete your profile?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${profile.user_id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to delete profile");
      }
      alert("Profile deleted successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="bg-white p-6 rounded-lg shadow text-black">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow text-black">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Two-column grid form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {/* Username */}
        <div>
          <Label htmlFor="username" className="text-black">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            value={profile.username || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password_hash" className="text-black">
            New Password
          </Label>
          <Input
            id="password_hash"
            name="password_hash"
            type="password"
            value={profile.password_hash || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
          <p className="text-gray-500 text-sm">
            Leave blank if you don’t want to change your password.
          </p>
        </div>

        {/* First Name */}
        <div>
          <Label htmlFor="name" className="text-black">
            First Name
          </Label>
          <Input
            id="name"
            name="name"
            value={profile.name || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Surname */}
        <div>
          <Label htmlFor="surname" className="text-black">
            Surname
          </Label>
          <Input
            id="surname"
            name="surname"
            value={profile.surname || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Full Name */}
        <div>
          <Label htmlFor="fullname" className="text-black">
            Full Name
          </Label>
          <Input
            id="fullname"
            name="fullname"
            value={profile.fullname || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Job Description */}
        <div>
          <Label htmlFor="job_description" className="text-black">
            Job Description
          </Label>
          <Input
            id="job_description"
            name="job_description"
            value={profile.job_description || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-black">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={profile.email || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Supplier Code */}
        <div>
          <Label htmlFor="supplier_code" className="text-black">
            Supplier Code
          </Label>
          <Input
            id="supplier_code"
            name="supplier_code"
            value={profile.supplier_code || ""}
            onChange={handleInputChange}
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Role (read-only) */}
        <div>
          <Label htmlFor="role" className="text-black">
            Role
          </Label>
          <Input
            id="role"
            name="role"
            value={profile.role || ""}
            disabled
            className="text-black mt-1 w-full"
          />
        </div>

        {/* Department (read-only) */}
        {/* Action Buttons (col-span-2 to stretch across both columns) */}
        <div className="col-span-2 flex flex-col space-y-4 mt-4">
          <Button type="submit" className="flex items-center justify-center gap-2 bg-indigo-500 text-white w-full h-12 rounded">
            <Save className="mr-2 h-6 w-6" /> Save Changes
          </Button>

          <Button
            onClick={handleDeleteProfile}
            className="bg-red-500 text-white w-full rounded"
          >
            Delete Profile
          </Button>
        </div>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                    SUPPLIER CHARGEBACK PREVIEW COMPONENT                   */
/* -------------------------------------------------------------------------- */
const SupplierChargebackPreview = ({ item, onClose }) => {
  const [selectedPictures, setSelectedPictures] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Local state for editing an item
  const [editItem, setEditItem] = useState({
    sqcb: item.sqcb || "",
    status: item.status || "",
    rqmr_no: item.rqmr_no || "",
    plant_id: item.plant_id || "",
    hd_incharge: item.hd_incharge || "",
    supplier_code: item.supplier_code || "",
    supplier_name: item.supplier_name || "",
    return_type: item.return_type || "",
    sqcb_amount: item.sqcb_amount || "",
    feedback_date: item.feedback_date || "",
    target_date: item.target_date || "",
    disposition: item.disposition || "WAITING FEEDBACK",
    rma_no: item.rma_no || "",
    qm10_complete_date: item.qm10_complete_date || "",
    po_no: item.po_no || "",
    obd_no: item.obd_no || "",
    dn_issued_date: item.dn_issued_date || "",
    scrap_week: item.scrap_week || "",
    second_po_no: item.second_po_no || "",
    second_obd_no: item.second_obd_no || "",
    comments: item.comments || "",
    parts: item.parts || [],
    attachments: item.attachments || [],
    pictures: item.pictures || [],
    sqcb_id: item.sqcb_id, // ensure we have the sqcb_id
  });

  // When the edit modal opens, format date fields so they are always a "YYYY-MM-DD" string
  useEffect(() => {
    if (isEditModalOpen) {
      setEditItem({
        ...item,
        sqcb_id: item.sqcb_id,
        feedback_date: item.feedback_date
          ? format(new Date(item.feedback_date), "yyyy-MM-dd")
          : "",
        target_date: item.target_date
          ? format(new Date(item.target_date), "yyyy-MM-dd")
          : "",
      });
    }
  }, [isEditModalOpen, item]);

  const [hdUsers, setHdUsers] = useState([]);

  // Fetch HD and Admin users for the HD-SQ field
  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (user) =>
            user.role &&
            (user.role.toLowerCase() === "hd" || user.role.toLowerCase() === "admin")
        );
        setHdUsers(filtered);
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  useEffect(() => {
    if (isEditModalOpen) {
      // Reset editItem from the original item each time edit is opened
      setEditItem({ ...item, sqcb_id: item.sqcb_id });
    }
  }, [isEditModalOpen, item]);

  /** Show pictures modal */
  const openPicturesModal = (pictures) => {
    setSelectedPictures(pictures);
  };
  /** Close pictures modal */
  const closePicturesModal = () => {
    setSelectedPictures(null);
  };

  /** Edit field changes */
  const handleEditInputChange = (e, field) => {
    if (e.target.type === "file") {
      // For file inputs
      setEditItem((prev) => ({ ...prev, [field]: e.target.files }));
    } else {
      setEditItem((prev) => ({ ...prev, [field]: e.target.value || "" }));
    }
  };

  /** Edit "parts" sub-fields */
  const handleEditPartChange = (e, index, field) => {
    const newParts = [...editItem.parts];
    newParts[index][field] = e.target.value || "";
    setEditItem({ ...editItem, parts: newParts });
  };

  /** For file fields in parts */
  const handleEditFileChange = (e, index) => {
    const files = e.target.files;
    const newParts = [...editItem.parts];
    newParts[index].pictures = files;
    setEditItem({ ...editItem, parts: newParts });
  };

  /** Add new part row */
  const addEditPart = () => {
    setEditItem((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          id: Date.now(),
          item_number: "",
          part_number: "",
          part_name: "",
          notification_number: "",
          qty: 1,
          pictures: [],
          file: null,
        },
      ],
    }));
  };

  /** Remove one part row */
  const removeEditPart = (index) => {
    const newParts = [...editItem.parts];
    newParts.splice(index, 1);
    setEditItem({ ...editItem, parts: newParts });
  };

  /** Remove attachment from DB */
  const handleRemoveAttachment = async (attachmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete attachment.");
      }
      setEditItem((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((att) => att.attachment_id !== attachmentId),
      }));
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert("Could not delete the attachment.");
    }
  };

  /** Submit updated item */
  const handleUpdateItem = () => {
    if (!editItem.disposition) {
      alert("Disposition is required.");
      return;
    }
    const formData = new FormData();
    // Basic fields
    formData.append("sqcb", editItem.sqcb || "");
    formData.append("status", editItem.status || "Open");
    formData.append("rqmr_no", editItem.rqmr_no || "");
    formData.append("plant_id", editItem.plant_id || "");
    formData.append("hd_incharge", editItem.hd_incharge || "");
    formData.append("supplier_code", editItem.supplier_code || "");
    formData.append("supplier_name", editItem.supplier_name || "");
    formData.append("return_type", editItem.return_type || "");
    formData.append("sqcb_amount", editItem.sqcb_amount || "");
    formData.append("feedback_date", editItem.feedback_date || "");
    formData.append("target_date", editItem.target_date || "");
    formData.append("disposition", editItem.disposition || "");
    formData.append("rma_no", editItem.rma_no || "");
    formData.append("qm10_complete_date", editItem.qm10_complete_date || "");
    formData.append("po_no", editItem.po_no || "");
    formData.append("obd_no", editItem.obd_no || "");
    formData.append("dn_issued_date", editItem.dn_issued_date || "");
    formData.append("scrap_week", editItem.scrap_week || "");
    formData.append("second_po_no", editItem.second_po_no || "");
    formData.append("second_obd_no", editItem.second_obd_no || "");
    formData.append("comments", editItem.comments || "");

    // Parts
    const partsWithItemNumber = editItem.parts.map((part, index) => ({
      ...part,
      item_number: index + 1,
      notification_number: part.notification_number || "",
      qty: part.qty || 1,
      part_number: part.part_number || "",
      part_name: part.part_name || "",
    }));
    formData.append("parts", JSON.stringify(partsWithItemNumber));

    // Attachments
    if (editItem.attachments && editItem.attachments.length > 0) {
      Array.from(editItem.attachments).forEach((file) => {
        formData.append("attachments", file);
      });
    }
    // Pictures
    if (editItem.pictures && editItem.pictures.length > 0) {
      Array.from(editItem.pictures).forEach((file) => {
        formData.append("pictures", file);
      });
    }

    fetch(`${API_BASE_URL}/sqcb/${editItem.sqcb_id}`, {
      method: "PUT",
      body: formData,
    })
      .then((resp) => {
        if (!resp.ok) {
          return resp.json().then((err) => {
            throw err;
          });
        }
        return resp.json();
      })
      .then((data) => {
        console.log("SQCB updated:", data);
        setIsEditModalOpen(false);
        onClose();
        window.location.reload(); // or trigger a re-fetch
      })
      .catch((error) => {
        console.error("Error updating SQCB:", error);
      });
  };

  const parts = Array.isArray(item.parts) ? item.parts : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
      <div
        className="bg-gray-100 p-4 md:p-6 max-w-full md:max-w-6xl mx-auto shadow-lg rounded-lg relative overflow-auto"
        style={{ maxHeight: "97vh" }}
      >
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <div className="bg-orange-500 w-full flex flex-col md:flex-row justify-between items-center p-2 mb-4">
          <div className="bg-orange-500 text-white w-full md:w-auto flex flex-col md:flex-row justify-between items-center mb-4 md:mb-0">
            <span className="text-xl md:text-2xl font-bold mb-2 md:mb-0">{item.sqcb || ""}</span>
          </div>
          <div className="flex space-x-4">
            <button
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              onClick={closePicturesModal}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit
            </button>
          </div>
        </div>

        {/* READ-ONLY VIEW */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="SQCB no." value={item.sqcb || ""} />
            <Field label="Status" value={item.status || ""} />
            <Field label="RQMR No." value={item.rqmr_no || ""} />
            <Field label="Disposition" value={item.disposition || ""} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Plant" value={item.plant_id || ""} />
            <Field label="HD SQ" value={item.hd_incharge || ""} />
            <Field label="Supplier Code" value={item.supplier_code || ""} />
            <Field label="Supplier Name" value={item.supplier_name || ""} />
          </div>
          <div className="bg-white p-4 rounded overflow-x-auto" style={{ maxHeight: "500px" }}>
            <h2 className="text-lg font-semibold mb-2">Parts Information</h2>
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Part Number</th>
                  <th className="p-2 text-left">Part Name</th>
                  <th className="p-2 text-left">Notification</th>
                  <th className="p-2 text-left">Qty.</th>
                  <th className="p-2 text-left">Picture Attach</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part, index) => (
                  <tr key={part.id || index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{part.part_number || ""}</td>
                    <td className="p-2">{part.part_name || ""}</td>
                    <td className="p-2">{part.notification_number || ""}</td>
                    <td className="p-2">{part.qty ?? ""}</td>
                    <td className="p-2">
                      {part.pictures && part.pictures.length > 0 ? (
                        <button
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                          onClick={() => openPicturesModal(part.pictures)}
                        >
                          View {part.pictures.length} Picture
                          {part.pictures.length > 1 ? "s" : ""}
                        </button>
                      ) : (
                        <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded text-xs">
                          Attach
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field
              label="Feedback Date"
              value={
                item.feedback_date
                  ? format(new Date(item.feedback_date), "dd/MM/yyyy")
                  : ""
              }
            />
            <Field
              label="Target Date (6 Working Day)"
              value={
                item.target_date
                  ? format(new Date(item.target_date), "dd/MM/yyyy")
                  : ""
              }
            />
            <Field label="RMA No." value={item.rma_no || ""} />
            <Field label="Return Type" value={item.return_type || ""} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field
              label="QM10 Completion"
              value={
                item.qm10_complete_date
                  ? format(new Date(item.qm10_complete_date), "dd/MM/yyyy")
                  : ""
              }
            />
            <Field
              label="DN Issued Date"
              value={
                item.dn_issued_date
                  ? format(new Date(item.dn_issued_date), "dd/MM/yyyy")
                  : ""
              }
            />
            <Field label="Scrap Week" value={item.scrap_week || ""} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="PO No." value={item.po_no || ""} />
            <Field label="OBD No." value={item.obd_no || ""} />
            <Field label="Attachments">
              {Array.isArray(item.attachments) && item.attachments.length > 0
                ? item.attachments.map((attachment, index) => (
                    <div key={attachment.attachment_id || index}>
                      <a
                        href={attachment.attachment_address}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {attachment.attachment_name || ""}
                      </a>
                    </div>
                  ))
                : "-"}
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="2nd PO No." value={item.second_po_no || ""} />
            <Field label="2nd OBD No." value={item.second_obd_no || ""} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Comments" value={item.comments || ""} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Created By" value={item.created_by || ""} />
            <Field label="Modified By" value={item.modified_by || ""} />
          </div>
        </div>

        {/* Pictures Modal */}
        {selectedPictures && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
            <div className="bg-white p-4 rounded-lg max-w-2xl w-full mx-4 my-6 md:my-10 overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                onClick={closePicturesModal}
              >
                ×
              </button>
              <h3 className="text-lg font-bold mb-4">Attached Pictures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPictures.map((picture, idx) => (
                  <div key={picture.id || idx} className="text-center">
                    <img
                      src={picture.picture_address || ""}
                      alt={`Picture ${idx + 1}`}
                      className="w-full h-auto object-cover mb-2"
                    />
                    <p className="text-sm">{picture.picture_name || ""}</p>
                  </div>
                ))}
              </div>
              <button
                className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={closePicturesModal}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
            <div
              className="bg-gray-100 p-4 md:p-6 max-w-full md:max-w-6xl mx-auto shadow-lg rounded-lg relative overflow-auto"
              style={{ maxHeight: "100vh" }}
            >
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
              <div className="bg-orange-500 text-white p-2 w-full md:w-auto flex flex-col md:flex-row justify-between items-center mb-4 md:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-white">Edit SQCB Item</h2>
                <div className="flex space-x-4">
                  <button
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => setIsEditModalOpen(false)}
                    aria-label="Cancel Changes"
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    onClick={handleUpdateItem}
                    aria-label="Save Changes"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Edit form fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-700">SQCB ID</label>
                    <Input
                      id="sqcbId"
                      name="sqcbId"
                      placeholder="SQCB ID"
                      value={editItem.sqcb || ""}
                      onChange={(e) => handleEditInputChange(e, "sqcb")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={editItem.status || "Open"}
                      onChange={(e) => handleEditInputChange(e, "status")}
                      className="border p-2.5 w-[210px]"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700">RQMR No.</label>
                    <Input
                      id="rqmrNo"
                      name="rqmrNo"
                      placeholder="RQMR No."
                      value={editItem.rqmr_no || ""}
                      onChange={(e) => handleEditInputChange(e, "rqmr_no")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Disposition</label>
                    <select
                      id="disposition"
                      name="disposition"
                      value={editItem.disposition || "WAITING FEEDBACK"}
                      onChange={(e) => handleEditInputChange(e, "disposition")}
                      className="border p-2.5 w-[210px]"
                    >
                      <option value="WAITING FEEDBACK">WAITING FEEDBACK</option>
                      <option value="FEEDBACK">FEEDBACK</option>
                      <option value="WAIT RMA">WAIT RMA</option>
                      <option value="SCRAP SUPPLIER">SCRAP SUPPLIER</option>
                      <option value="RETURN TO SUPPLIER">RETURN TO SUPPLIER</option>
                      <option value="SUPPLIER REJECT">SUPPLIER REJECT</option>
                      <option value="CANCEL">CANCEL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-700">Plant</label>
                    <select
                      id="plant"
                      name="plant_id"
                      value={editItem.plant_id || "3047"}
                      onChange={(e) => handleEditInputChange(e, "plant_id")}
                      className="border p-2.5 w-[210px]"
                    >
                      <option value="3047">3047</option>
                      <option value="3048">3048</option>
                      <option value="3049">3049</option>
                      <option value="1001">1001</option>
                      <option value="1003">1003</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700">HD SQ</label>
                    <select
                      id="hdSq"
                      name="hdSq"
                      value={editItem.hd_incharge || ""}
                      onChange={(e) => handleEditInputChange(e, "hd_incharge")}
                      className="border p-2.5 w-[210px]"
                    >
                      <option value="">Select Full Name</option>
                      {hdUsers.map((user) => (
                        <option key={user.user_id} value={user.fullname}>
                          {user.fullname}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700">Supplier Code</label>
                    <Input
                      id="supplierCode"
                      name="supplierCode"
                      placeholder="Supplier Code"
                      value={editItem.supplier_code || ""}
                      onChange={(e) => handleEditInputChange(e, "supplier_code")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Supplier Name</label>
                    <Input
                      id="supplierName"
                      name="supplierName"
                      placeholder="Supplier Name"
                      value={editItem.supplier_name || ""}
                      disabled
                    />
                  </div>
                </div>

                {/* Parts Editing */}
                <div className="bg-white p-4 rounded overflow-x-auto" style={{ maxHeight: "500px" }}>
                  <h2 className="text-lg font-semibold mb-2">Parts Information</h2>
                  <table className="w-full min-w-max bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-left">Part Number</th>
                        <th className="p-2 text-left">Part Name</th>
                        <th className="p-2 text-left">Notification</th>
                        <th className="p-2 text-left">Qty.</th>
                        <th className="p-2 text-left">Picture Attach</th>
                        <th className="p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItem.parts && editItem.parts.length > 0 ? (
                        editItem.parts.map((part, index) => (
                          <tr
                            key={part.id || index}
                            className={index % 2 === 0 ? "bg-gray-50" : ""}
                          >
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={part.part_number || ""}
                                onChange={(e) => handleEditPartChange(e, index, "part_number")}
                                className="border p-1 w-full"
                                placeholder="Part Number"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={part.part_name || ""}
                                onChange={(e) => handleEditPartChange(e, index, "part_name")}
                                className="border p-1 w-full"
                                placeholder="Part Name"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={part.notification_number || ""}
                                onChange={(e) => handleEditPartChange(e, index, "notification_number")}
                                className="border p-1 w-full"
                                placeholder="Notification"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={part.qty || ""}
                                onChange={(e) => handleEditPartChange(e, index, "qty")}
                                className="border p-1 w-full"
                                placeholder="Quantity"
                                min="1"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(ev) => {
                                  handleEditFileChange(ev, index);
                                  setEditItem((prev) => ({
                                    ...prev,
                                    pictures: ev.target.files,
                                  }));
                                }}
                                className="border p-1 w-full"
                              />
                            </td>
                            <td className="p-2">
                              <button
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                onClick={() => removeEditPart(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-gray-500">
                            No parts available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
                    onClick={addEditPart}
                  >
                    Add New Part
                  </button>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-700">Feedback Date</label>
                    <DatePicker
                      selected={editItem.feedback_date ? new Date(editItem.feedback_date) : null}
                      onChange={(date) => {
                        const formattedFeedback = format(date, "yyyy-MM-dd");
                        const formattedTarget = format(addDays(date, 6), "yyyy-MM-dd");
                        handleEditInputChange(
                          { target: { value: formattedFeedback } },
                          "feedback_date"
                        );
                        handleEditInputChange(
                          { target: { value: formattedTarget } },
                          "target_date"
                        );
                      }}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select Feedback Date"
                      className="p-2 border w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Target Date (+6 Working Days)</label>
                    <DatePicker
                      selected={editItem.target_date ? new Date(editItem.target_date) : null}
                      onChange={(date) =>
                        handleEditInputChange({ target: { value: formatDate(date) } }, "target_date")
                      }
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select Target Date"
                      className="p-2 border w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">RMA No.</label>
                    <Input
                      id="rmaNo"
                      name="rmaNo"
                      placeholder="RMA No."
                      value={editItem.rma_no || ""}
                      onChange={(e) => handleEditInputChange(e, "rma_no")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Return Type</label>
                    <select
                      id="returnType"
                      name="returnType"
                      value={editItem.return_type || ""}
                      onChange={(e) => handleEditInputChange(e, "return_type")}
                      className="border p-2.5 w-[210px]"
                    >
                      <option value="">Select Return Type</option>
                      <option value="STO">STO</option>
                      <option value="NON-STO">NON-STO</option>
                      <option value="STO-EXW">STO-EXW</option>
                      <option value="null">null</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-700">QM10 Complete Date</label>
                    <DatePicker
                      selected={editItem.qm10_complete_date ? new Date(editItem.qm10_complete_date) : null}
                      onChange={(date) =>
                        handleEditInputChange(
                          { target: { value: formatDate(date) } },
                          "qm10_complete_date"
                        )
                      }
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select QM10 Complete Date"
                      className="p-2 border w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">DN Issued Date</label>
                    <DatePicker
                      selected={editItem.dn_issued_date ? new Date(editItem.dn_issued_date) : null}
                      onChange={(date) =>
                        handleEditInputChange({ target: { value: formatDate(date) } }, "dn_issued_date")
                      }
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select DN Issued Date"
                      className="p-2 border w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Scrap Week</label>
                    <Input
                      id="scrapWeek"
                      name="scrapWeek"
                      placeholder="Scrap Week"
                      value={editItem.scrap_week || ""}
                      onChange={(e) => handleEditInputChange(e, "scrap_week")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700">PO No.</label>
                    <Input
                      id="poNo"
                      name="poNo"
                      placeholder="PO No."
                      value={editItem.po_no || ""}
                      onChange={(e) => handleEditInputChange(e, "po_no")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">OBD No.</label>
                    <Input
                      id="obdNo"
                      name="obdNo"
                      placeholder="OBD No."
                      value={editItem.obd_no || ""}
                      onChange={(e) => handleEditInputChange(e, "obd_no")}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-bold">Current Attachments</label>
                    {editItem.attachments && editItem.attachments.length > 0 ? (
                      editItem.attachments.map((attachment) => (
                        <div key={attachment.attachment_id} className="flex items-center space-x-2 my-2">
                          <a
                            href={attachment.attachment_address || ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            {attachment.attachment_name || ""}
                          </a>
                          <button
                            className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                            onClick={() => handleRemoveAttachment(attachment.attachment_id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>No attachments.</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700">2nd PO No.</label>
                    <Input
                      id="secondPoNo"
                      name="secondPoNo"
                      placeholder="2nd PO No."
                      value={editItem.second_po_no || ""}
                      onChange={(e) => handleEditInputChange(e, "second_po_no")}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">2nd OBD No.</label>
                    <Input
                      id="secondObdNo"
                      name="secondObdNo"
                      placeholder="2nd OBD No."
                      value={editItem.second_obd_no || ""}
                      onChange={(e) => handleEditInputChange(e, "second_obd_no")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-gray-700">Comments</label>
                    <textarea
                      placeholder="Comments"
                      value={editItem.comments || ""}
                      onChange={(e) => handleEditInputChange(e, "comments")}
                      className="border p-2 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button className="mr-2 bg-gray-500" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-indigo-500" onClick={handleUpdateItem}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                           SUMMARY REPORT COMPONENT                         */
/* -------------------------------------------------------------------------- */
const SummaryReport = ({ data, loading }) => {
  
   // States for computed summary metrics and chart/table data
  const [overviewData, setOverviewData] = useState({});
  const [newComingNCMData, setNewComingNCMData] = useState([]);
  const [pendingInformData, setPendingInformData] = useState([]);
  const [waitingRMAData, setWaitingRMAData] = useState([]);
  const [receivedRMAData, setReceivedRMAData] = useState([]);
  const [newComingNCMTableData, setNewComingNCMTableData] = useState([]);
  const [pendingInformTableData, setPendingInformTableData] = useState([]);
  const [waitingRMATableData, setWaitingRMATableData] = useState([]);
  const [receivedRMATableData, setReceivedRMATableData] = useState([]);

    // Compute overview metrics
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Example logic for dispositions:
    const newComingNCMCount = data.filter(
      (item) =>
        item.disposition?.toLowerCase() === "waiting feedback" &&
        isWithin6Days(item.modified)
    ).length;

    // 2) Pending Inform
    //    (disposition === "WAITING FEEDBACK") && (modified > 6 days)
    const pendingInformCount = data.filter(
      (item) =>
        item.disposition?.toLowerCase() === "waiting feedback" &&
        !isWithin6Days(item.modified)
    ).length;

    // 3) Waiting RMA
    //    (disposition === "FEEDBACK") && (rma_no == null)
    const waitingRMACount = data.filter(
      (item) =>
        item.disposition?.toLowerCase() === "feedback" &&
        isRmaNoNull(item.rma_no)
    ).length;
    
    const receivedRMAWaitingPOCount = data.filter(
      (item) =>
        item.disposition &&
        ["scrap supplier"].includes(
          item.disposition.toLowerCase()
        ) &&
        item.rma_no &&
        item.status && ["Open", "Pending"].includes(item.status)
    ).length;
    // Placeholder values for additional metrics:
    const waitingRTVCount =  data.filter(
      (item) =>
        item.disposition &&
        ["return to supplier"].includes(
          item.disposition.toLowerCase()
        ) &&
        item.rma_no
    ).length;
    const supplierRejectCount = data.filter(
      (item) =>
        item.disposition &&
        ["supplier reject"].includes(
          item.disposition.toLowerCase()
        )         
    ).length;

    setOverviewData({
      newComingNCM: newComingNCMCount,
      pendingInform: pendingInformCount,
      waitingRMA: waitingRMACount,
      receivedRMAWaitingPO: receivedRMAWaitingPOCount,
      waitingRTV: waitingRTVCount,
      supplierReject: supplierRejectCount,
    });

    // Group API data by feedback_date for newComingNCM chart
    const ncmDataByDate = {};
    data.forEach((item) => {
      if (item.feedback_date) {
        ncmDataByDate[item.feedback_date] = (ncmDataByDate[item.feedback_date] || 0) + 1;
      }
    });
    const ncmChartData = Object.keys(ncmDataByDate).map((date) => ({
      date,
      value: ncmDataByDate[date],
    }));
    setNewComingNCMData(ncmChartData);

    // For pendingInformData, you might group by a different date or field
    // This is a placeholder grouping by feedback_date as well.
    const pendingDataByDate = {};
    data.forEach((item) => {
      if (item.feedback_date) {
        pendingDataByDate[item.feedback_date] = (pendingDataByDate[item.feedback_date] || 0) + 1;
      }
    });
    const pendingChartData = Object.keys(pendingDataByDate).map((date) => ({
      date,
      value: pendingDataByDate[date],
    }));
    setPendingInformData(pendingChartData);

    // For waitingRMAData and receivedRMAData, you can create similar groupings
    // Here we provide placeholder arrays.
    setWaitingRMAData([{ name: "Group A", value: waitingRMACount }]);
    setReceivedRMAData([{ name: "Group B", value: receivedRMAWaitingPOCount }]);

    // For table data, we use a slice of the API data with example formatting.
    setNewComingNCMTableData(
      data.slice(0, 5).map((item) => ({
        sqa: item.hd_incharge || "N/A",
        aging: 3, // Placeholder: add aging logic if needed
        vendor: item.supplier_name || "N/A",
        materialDescription: item.comments || "N/A",
      }))
    );
    setPendingInformTableData(
      data.slice(0, 5).map((item) => ({
        sqa: item.hd_incharge || "N/A",
        aging: 20, // Placeholder
        vendor: item.supplier_name || "N/A",
        materialDescription: item.comments || "N/A",
      }))
    );
    setWaitingRMATableData(
      data.slice(0, 5).map((item) => ({
        disposition: item.disposition || "",
        sqaId: item.hd_incharge || "",
        countOfTitle: 1,
        supplierName: item.supplier_name || "",
        averageAging: 20.0,
        comment: item.comments || "",
      }))
    );
    setReceivedRMATableData(
      data.slice(0, 5).map((item) => ({
        rma: item.rma_no || "",
        sqaId: item.hd_incharge || "",
        title: item.sqcb || "",
        supplierName: item.supplier_name || "",
        averageAging: 20.0,
        comment: item.comments || "",
      }))
    );
  }, [data]);

  const [summaryActiveTab, setSummaryActiveTab] = useState("overview");

  // 1) Overview
  function renderOverview() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(overviewData).map(([key, value]) => (
          <Card key={key} title={key.replace(/([A-Z])/g, " $1").trim()}>
            <p className="text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
    );
  }

  // 1) newComingNCM
  //    disposition = "WAITING FEEDBACK"
  //    "modified" < 6 days from today
  function renderNewComingNCM() {
    const newComingNCMItems = data.filter((item) => {
      const disp = item.disposition?.toLowerCase() || "";
      return disp === "waiting feedback" && isWithin6Days(item.modified);
    });

    // Example grouping for a line chart by "modified" date or feedback_date
    // Adjust grouping as needed
    const groupByDate = {};
    newComingNCMItems.forEach((item) => {
      const dateObj = new Date(item.modified); // e.g. "Mon, 1 Mar 2025 19:34:41 GMT"
      if (isNaN(dateObj.getTime())) {
        // If parse fails, label as "NoDate"
        groupByDate["NoDate"] = (groupByDate["NoDate"] || 0) + 1;
      } else {
        // Convert dateObj to a string like "2025-03-01" or any format
        const dateKey = dateObj.toISOString().split("T")[0];
        groupByDate[dateKey] = (groupByDate[dateKey] || 0) + 1;
      }
    });
    const chartData = Object.entries(groupByDate).map(([date, count]) => ({
      date,
      value: count
    }));

    // Build table data
    const tableData = newComingNCMItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      MODIFIED: item.modified || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || ""
    }));

    return (
      <>
        <Card title="New Coming NCM">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" /* type="category" (default) */ />
              <YAxis domain={[0, (dataMax) => dataMax + 3]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="New Coming NCM Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // 2) pendingInform
  //    disposition = "WAITING FEEDBACK"
  //    "modified" > 6 days from today
  function renderPendingInform() {
    const pendingInformItems = data.filter((item) => {
      const disp = item.disposition?.toLowerCase() || "";
      if (disp !== "waiting feedback") return false;
      // If it's waiting feedback, we check if it's over 6 days
      // i.e. NOT within 6 days
      return !isWithin6Days(item.modified);
    });

    // Example grouping for a bar chart
    const groupByDate = {};
    pendingInformItems.forEach((item) => {
      const key = item.modified?.split("T")[0] || "NoDate";
      groupByDate[key] = (groupByDate[key] || 0) + 1;
    });
    const chartData = Object.entries(groupByDate).map(([date, count]) => ({
      date,
      value: count
    }));

    const tableData = pendingInformItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      MODIFIED: item.modified || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || ""
    }));

    return (
      <>
        <Card title="Pending Inform">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, (dataMax) => dataMax + 3]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Pending Inform Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // 3) waiting RMA
  //    disposition = "FEEDBACK"
  //    rma_no is null (empty or undefined)
  function renderWaitingRMA() {
    const waitingRMAItems = data.filter((item) => {
      const disp = item.disposition?.toLowerCase() || "";
      return disp === "feedback" && isRmaNoNull(item.rma_no);
    });

    // Example grouping for a pie chart
    const groupByIncharge = {};
    waitingRMAItems.forEach((item) => {
      const key = item.hd_incharge || "Unknown";
      groupByIncharge[key] = (groupByIncharge[key] || 0) + 1;
    });
    const chartData = Object.entries(groupByIncharge).map(([name, value]) => ({
      name,
      value
    }));

    const tableData = waitingRMAItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      RMA_NO: item.rma_no || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || ""
    }));

    return (
      <>
        <Card title="Waiting RMA">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={chartData} fill="#8884d8" label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Waiting RMA Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // 4) received RMA waiting PO
  //    disposition = "SCRAP SUPPLIER"
  //    rma_no not null
  function renderReceivedRMA() {
    const receivedRMAItems = data.filter((item) => {
      const disp = item.disposition?.toLowerCase() || "";
      return disp === "scrap supplier" && !isRmaNoNull(item.rma_no) && item.status && ["Open", "Pending"].includes(item.status);
    });

    const groupByIncharge = {};
    receivedRMAItems.forEach((item) => {
      const key = item.hd_incharge || "Unknown";
      groupByIncharge[key] = (groupByIncharge[key] || 0) + 1;
    });
    const chartData = Object.entries(groupByIncharge).map(([name, value]) => ({
      name,
      value
    }));

    const tableData = receivedRMAItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      RMA_NO: item.rma_no || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || ""
    }));

    return (
      <>
        <Card title="Received RMA Waiting PO">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={chartData} fill="#82ca9d" label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Received RMA Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // 5) waiting RTV
  //    disposition = "RETURN TO SUPPLIER"
  //    rma_no not null
  function renderWaitingRTV() {
    const waitingRTVItems = data.filter((item) => {
      const disp = item.disposition?.toLowerCase() || "";
      return disp === "return to supplier" && !isRmaNoNull(item.rma_no);
    });

    const groupByIncharge = {};
    waitingRTVItems.forEach((item) => {
      const key = item.hd_incharge || "Unknown";
      groupByIncharge[key] = (groupByIncharge[key] || 0) + 1;
    });
    const chartData = Object.entries(groupByIncharge).map(([name, value]) => ({
      name,
      value
    }));

    const tableData = waitingRTVItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      RMA_NO: item.rma_no || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || ""
    }));

    return (
      <>
        <Card title="Waiting RTV">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={chartData} fill="#82ca9d" label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Waiting RTV Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // 6) supplier Reject
  //    disposition = "SUPPLIER REJECT"
  function renderSupplierReject() {
    const supplierRejectItems = data.filter(
      (item) => item.disposition?.toLowerCase() === "supplier reject"
    );

    // Example grouping for a bar chart
    const groupByIncharge = {};
    supplierRejectItems.forEach((item) => {
      const key = item.hd_incharge || "Unknown";
      groupByIncharge[key] = (groupByIncharge[key] || 0) + 1;
    });
    const chartData = Object.entries(groupByIncharge).map(([name, value]) => ({
      name,
      value
    }));

    const tableData = supplierRejectItems.map((item) => ({
      ID: item.sqcb_id || "",
      DISPOSITION: item.disposition || "",
      SUPPLIER: item.supplier_name || "",
      COMMENT: item.comments || "",
    }));

    return (
      <>
        <Card title="Supplier Reject">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Supplier Reject Details">
          <Table data={tableData} />
        </Card>
      </>
    );
  }

  // Decide which tab to render
  function renderContent() {
    if (loading) {
      return <p>Loading summary...</p>;
    }
    switch (summaryActiveTab) {
      case "overview":
        return renderOverview();
      case "newComingNCM":
        return renderNewComingNCM();
      case "pendingInform":
        return renderPendingInform();
      case "waitingRMA":
        return renderWaitingRMA();
      case "receivedRMA":
        return renderReceivedRMA();
      case "waitingRTV":
        return renderWaitingRTV();
      case "supplierReject":
        return renderSupplierReject();
      default:
        return renderOverview();
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">SUPPLIER QUALITY RMA OVERVIEW PROCESS</h1>
      {/* Sub-Tab Buttons */}
      <div className="mb-4">
        {[
          "overview",
          "newComingNCM",
          "pendingInform",
          "waitingRMA",
          "receivedRMA",
          "waitingRTV",
          "supplierReject"
        ].map((tab) => (
          <button
            key={tab}
            className={`mr-2 px-4 py-2 rounded ${
              summaryActiveTab === tab ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setSummaryActiveTab(tab)}
          >
            {tab.replace(/([A-Z])/g, " $1").trim()}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                      COMPREHENSIVE DASHBOARD COMPONENT                     */
/* -------------------------------------------------------------------------- */
const ComprehensiveDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [sqcbData, setSqcbData] = useState([]);
  const [loading, setLoading] = useState(true);
  // user in localStorage
  const [user, setUser] = useState({ name: "", role: "", supplier_code: "", supplier_name: "" });

  ///////////////////////////////////////////
  // 1) Define your plantFilter state
  ///////////////////////////////////////////
  const [plantFilter, setPlantFilter] = useState("all");

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    console.log('Selected plant:', selectedValue);
    setPlantFilter(selectedValue);
  };

  const plantMapping = {
    Thailand: ["3047", "3048", "3049"],
    York: ["1001"],
    Tomahawk: ["1003"],
  };
  
  // Apply the filter to your data
  const filteredSqcbData = useMemo(() => {
    if (!Array.isArray(sqcbData)) {
      console.error("sqcbData is not an array:", sqcbData);
      return [];
    }

    // 1) Filter by plant
    let results = [...sqcbData];
    if (plantFilter !== "all") {
      const validPlantIds = plantMapping[plantFilter] || [];
      results = results.filter((item) =>
        validPlantIds.includes(String(item.plant_id))
      );
    }

    // 2) Filter by search term
    if (searchTerm.trim()) {
      results = results.filter((item) =>
        Object.values(item).some((value) =>
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return results;
  }, [sqcbData, plantFilter, searchTerm]);

  const handleDownload = () => {
    if (!sqcbData || sqcbData.length === 0) {
      alert("No data available to download.");
      return;
    }
    // Convert sqcbData to XLSX
    const worksheet = XLSX.utils.json_to_sheet(sqcbData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SQCBData");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, "sqcb_data.xlsx");
  };

  // On mount, get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser({ name: "Guest", role: "Supplier" });
    }
  }, []);

  // Fetch SQCB data once
  useEffect(() => {
    const fetchSqcbData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sqcb`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const sqcbArray = Array.isArray(data) ? data : data.data || [];
        setSqcbData(sqcbArray);
      } catch (error) {
        console.error("Error fetching SQCB data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSqcbData();
  }, []);

  // State for new item creation
  const [newItem, setNewItem] = useState({
    sqcb: "",
    status: "Open",
    rqmr_no: "",
    plant_id: "",
    hd_incharge: "",
    supplier_code: "",
    supplier_name: "",
    return_type: "",
    sqcb_amount: "",
    feedback_date: "",
    target_date: "",
    disposition: "WAITING FEEDBACK",
    rma_no: "",
    qm10_complete_date: "",
    po_no: "",
    obd_no: "",
    dn_issued_date: "",
    scrap_week: "",
    second_po_no: "",
    second_obd_no: "",
    comments: "",
    attachments: null,
    pictures: null,
    parts: [],
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const openItemModal = (item) => setSelectedItem(item);
  const closeItemModal = () => setSelectedItem(null);

  const openCreateModal = () => setCreateModalOpen(true);
  const closeCreateNewItemModal = () => {
    setCreateModalOpen(false);
    // Clear the newItem form
    setNewItem({
      sqcb: "",
      status: "Open",
      rqmr_no: "",
      plant_id: "",
      hd_incharge: "",
      supplier_code: "",
      supplier_name: "",
      return_type: "",
      sqcb_amount: "",
      feedback_date: "",
      target_date: "",
      disposition: "WAITING FEEDBACK",
      rma_no: "",
      qm10_complete_date: "",
      po_no: "",
      obd_no: "",
      dn_issued_date: "",
      scrap_week: "",
      second_po_no: "",
      second_obd_no: "",
      comments: "",
      attachments: null,
      pictures: null,
      parts: [],
    });
  };

  /** Input changes for create new item */
  const handleInputChange = (e, field) => {
    if (e.target.type === "file") {
      setNewItem({ ...newItem, [field]: e.target.files });
    } else {
      setNewItem({ ...newItem, [field]: e.target.value || "" });
    }
  };

  /** Fetch Supplier Name from API by supplier_code */
  const fetchSupplierName = async (supplierCode) => {
    try {
      if (!supplierCode) return;
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplierCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.supplier_name) {
          setNewItem((prevItem) => ({ ...prevItem, supplier_name: data.supplier_name }));
        } else {
          setNewItem((prevItem) => ({ ...prevItem, supplier_name: "Please add supplier" }));
        }
      } else {
        setNewItem((prevItem) => ({ ...prevItem, supplier_name: "Please add supplier" }));
        console.error(`Error fetching supplier: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching supplier name:", error);
    }
  };

  /** On supplier code change, fetch name if not empty */
  const handleSupplierCodeChange = (e) => {
    const supplierCode = e.target.value || "";
    setNewItem({ ...newItem, supplier_code: supplierCode });
    if (supplierCode.length > 0) {
      fetchSupplierName(supplierCode);
    } else {
      setNewItem((prevItem) => ({ ...prevItem, supplier_name: "" }));
    }
  };

  /** Parts array changes */
  const handlePartChange = (e, index, field) => {
    const newParts = [...newItem.parts];
    newParts[index][field] = e.target.value || "";
    setNewItem({ ...newItem, parts: newParts });
  };
  const addNewPart = () => {
    setNewItem((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          id: Date.now(),
          part_number: "",
          part_name: "",
          notification_number: "",
          qty: 1,
          pictures: [],
          file: null,
        },
      ],
    }));
  };
  const removePart = (index) => {
    const newParts = [...newItem.parts];
    newParts.splice(index, 1);
    setNewItem({ ...newItem, parts: newParts });
  };

  /** Create new SQCB item */
  const handleCreateNewItem = () => {
    if (!newItem.sqcb || !newItem.plant_id || !newItem.supplier_code) {
      alert("Please fill in all required fields (SQCB ID, Plant ID, Supplier Code)");
      return;
    }
    const formData = new FormData();
    // Basic fields
    formData.append("sqcb", newItem.sqcb || "");
    formData.append("status", newItem.status || "Open");
    formData.append("rqmr_no", newItem.rqmr_no || "");
    formData.append("plant_id", newItem.plant_id || "");
    formData.append("hd_incharge", newItem.hd_incharge || "");
    formData.append("supplier_code", newItem.supplier_code || "");
    formData.append("return_type", newItem.return_type || "");
    formData.append("sqcb_amount", newItem.sqcb_amount || "");
    formData.append("feedback_date", newItem.feedback_date || "");
    formData.append("target_date", newItem.target_date || "");
    formData.append("disposition", newItem.disposition || "WAITING FEEDBACK");
    formData.append("rma_no", newItem.rma_no || "");
    formData.append("qm10_complete_date", newItem.qm10_complete_date || "");
    formData.append("po_no", newItem.po_no || "");
    formData.append("obd_no", newItem.obd_no || "");
    formData.append("dn_issued_date", newItem.dn_issued_date || "");
    formData.append("scrap_week", newItem.scrap_week || "");
    formData.append("second_po_no", newItem.second_po_no || "");
    formData.append("second_obd_no", newItem.second_obd_no || "");
    formData.append("comments", newItem.comments || "");

    // Parts
    const partsWithItemNumber = newItem.parts.map((part, index) => ({
      ...part,
      item_number: index + 1,
      notification_number: part.notification_number || "",
      qty: part.qty || 1,
      part_number: part.part_number || "",
      part_name: part.part_name || "",
    }));
    formData.append("parts", JSON.stringify(partsWithItemNumber));

    // attachments
    if (newItem.attachments) {
      Array.from(newItem.attachments).forEach((file) => {
        formData.append("attachments", file);
      });
    }
    // pictures
    if (newItem.pictures) {
      Array.from(newItem.pictures).forEach((file) => {
        formData.append("picture", file);
      });
    }

    fetch(`${API_BASE_URL}/sqcb`, {
      method: "POST",
      body: formData,
    })
      .then((resp) => {
        if (!resp.ok) {
          return resp.json().then((err) => Promise.reject(err));
        }
        return resp.json();
      })
      .then((data) => {
        console.log("SQCB created successfully:", data);
        alert("SQCB created successfully!");
        setCreateModalOpen(false);
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error creating SQCB:", error);
        alert("Error creating SQCB. Please try again.");
      });
  };

  // Fetch the list of users (if not already fetched globally)
  const [hdUsers, setHdUsers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then((res) => res.json())
      .then((data) => {
        // Filter only users with role "HD" or "Admin"
        const filtered = data.filter(
          (user) =>
            user.role &&
            (user.role.toLowerCase() === "hd" || user.role.toLowerCase() === "admin")
        );
        setHdUsers(filtered);
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  // Filter logic
  const filteredData = useMemo(() => {
    if (!Array.isArray(sqcbData)) {
      console.error("sqcbData is not an array:", sqcbData);
      return [];
    }
    return sqcbData.filter((item) =>
      Object.values(item).some((value) =>
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [sqcbData, searchTerm]);

  /** Renders table for given data array */
  const renderTable = (data) => (
    <div className="overflow-x-auto">
      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">SQCB List</h2>
            <div className="flex space-x-2">
              <button className="bg-indigo-500 text-white px-4 py-2 rounded" onClick={openCreateModal}>
                Create New Item
              </button>
              <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="p-2 border-b">ID</th>
                <th className="p-2 border-b">SQCB</th>
                <th className="p-2 border-b">Status</th>
                <th className="p-2 border-b">RQMR No.</th>
                <th className="p-2 border-b">Plant ID</th>
                <th className="p-2 border-b">HD Fullname</th>
                <th className="p-2 border-b">Supplier Code</th>
                <th className="p-2 border-b">Return Type</th>
                <th className="p-2 border-b">Notification Number</th>
                <th className="p-2 border-b">SQCB Amount</th>
                <th className="p-2 border-b">Feedback Date</th>
                <th className="p-2 border-b">Target Date (+6 Working Days)</th>
                <th className="p-2 border-b">Disposition</th>
                <th className="p-2 border-b">RMA No.</th>
                <th className="p-2 border-b">Link</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr
                  key={item.sqcb_id || idx}
                  className="hover:bg-gray-50 cursor-pointer text-black"
                  onClick={() => openItemModal(item)}
                >
                  <td className="p-2 border-b">{item.sqcb_id || ""}</td>
                  <td className="p-2 border-b">{item.sqcb || ""}</td>
                  <td className="p-2 border-b">{item.status || ""}</td>
                  <td className="p-2 border-b">{item.rqmr_no || ""}</td>
                  <td className="p-2 border-b">{item.plant_id || ""}</td>
                  <td className="p-2 border-b">{item.hd_incharge || ""}</td>
                  <td className="p-2 border-b">{item.supplier_code || ""}</td>
                  <td className="p-2 border-b">{item.return_type || ""}</td>
                  <td className="p-2 border-b">{item.notification_number || "-"}</td>
                  <td className="p-2 border-b">{item.sqcb_amount || ""}</td>
                  <td className="p-2 border-b">{item.feedback_date || ""}</td>
                  <td className="p-2 border-b">{item.target_date || ""}</td>
                  <td className="p-2 border-b">{item.disposition || ""}</td>
                  <td className="p-2 border-b">{item.rma_no || ""}</td>
                  <td className="p-2 border-b">
                    <button className="text-blue-500">▶</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );

  const currentDateTime = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1) Count "New SQCB"
  const newSQCBCount = filteredSqcbData.filter(
    (item) =>
      item.disposition?.toLowerCase() === "waiting feedback"
  ).length;

  // 2) Count "Waiting RMA"
  const waitingRMACount = filteredSqcbData.filter(
    (item) =>
      item.disposition?.toLowerCase() === "feedback" &&
      isRmaNoNull(item.rma_no)
  ).length;

  // 3) Count "Received RMA"
  const receivedRMACount = filteredSqcbData.filter(
    (item) =>
      ["scrap supplier", "return to supplier"].includes(
        item.disposition?.toLowerCase() || ""
      ) &&
      item.rma_no &&
      !item.po_no &&
      !item.obd_no
  ).length;

  // Suppose you build your data array like this:
  const defectQuantityData = [
    { name: "New SQCB", value: newSQCBCount },
    { name: "Waiting RMA", value: waitingRMACount },
    { name: "Received RMA", value: receivedRMACount },
  ];

  
  // Dynamically build nav items based on user.role
  let navItems = [];
  if (user.role === "Supplier") {
    navItems = [
      { id: "overview", label: "Overview" },
      { id: "sqcbFullReport", label: "SQCB Full Report" },
      { id: "profileSettings", label: "Profile Setting" },
    ];
  } else if (user.role === "HD") {
    navItems = [
      { id: "overview", label: "Overview" },
      { id: "sqcbFullReport", label: "SQCB Full Report" },
      { id: "summaryReport", label: "Summary Report" },
      { id: "profileSettings", label: "Profile Setting" },
    ];
  } else if (user.role === "Admin") {
    navItems = [
      { id: "overview", label: "Overview" },
      { id: "sqcbFullReport", label: "SQCB Full Report" },
      { id: "summaryReport", label: "Summary Report" },
      { id: "profileSettings", label: "Profile Setting" },
      { id: "permissionManagement", label: "Permission Management" },
    ];
  }

  return (
    <div className="flex h-screen bg-gray-100 text-black">
      {/* Sidebar */}
      <div
        className={`bg-gray-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 transition duration-200 ease-in-out z-20`}
      >
        <nav>
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-2xl font-bold">HD-SQCB</div>
            <button onClick={toggleSidebar} className="md:hidden text-white focus:outline-none">
              <X size={24} />
            </button>
          </div>
          {navItems.map((tab) => (
            <a
              key={tab.id}
              href="#"
              onClick={() => setActiveTab(tab.id)}
              className={`block py-2.5 px-4 rounded transition duration-200 ${
                activeTab === tab.id ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white shadow-md">
          {/* Mobile menu toggle button */}
          <button
            onClick={toggleSidebar}
            className={`text-gray-500 focus:outline-none z-30 ${
              sidebarOpen ? "hidden" : "block"
            } md:hidden`}
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Hi {user.name || "User"}</h1>
            <p className="text-sm text-gray-500">
              Supplier Code: {user.supplier_code || "--"} &nbsp;
              Supplier Name: {user.supplier_name || "--"} &nbsp;
              Role: {user.role || "Guest"}
            </p>
          </div>
          <div className="items-center space-x-2">
            <div className="rounded p-1 text-black">
            <span className="text-orange font-semibold">Date/Time     </span>
              {currentDateTime}
            </div>
            <span className="text-orange font-semibold">Plant</span>
            <select
              className="border rounded p-1 text-black"
              value={plantFilter}
              onChange={handleChange}
            >
              <option value="all">All Plants</option>
              <option value="Thailand">Thailand</option>
              <option value="York">York</option>
              <option value="Tomahawk">Tomahawk</option>
            </select>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 text-black">
          {/* TABS */}
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-black">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm text-gray-500">New SQCB</h3>
                  <p className="text-2xl font-bold text-black">
                    {
                      filteredSqcbData.filter(
                        (item) => item.disposition && item.disposition.toLowerCase() === "waiting feedback"
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm text-gray-500">Waiting RMA</h3>
                  <p className="text-2xl font-bold text-black">
                    {
                      filteredSqcbData.filter(
                        (item) => item.disposition && item.disposition.toLowerCase() === "feedback"
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm text-gray-500">Received RMA</h3>
                  <p className="text-2xl font-bold text-black">
                    {
                      filteredSqcbData.filter(
                        (item) =>
                          item.disposition &&
                          ["scrap supplier", "return to supplier"].includes(
                            item.disposition.toLowerCase()
                          ) &&
                          item.rma_no &&
                          !item.po_no &&
                          !item.obd_no
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm text-gray-500">Completed</h3>
                  <p className="text-2xl font-bold text-black">
                    {
                      filteredSqcbData.filter(
                        (item) =>
                          item.disposition &&
                          ["scrap supplier", "return to supplier"].includes(
                            item.disposition.toLowerCase()
                          ) &&
                          item.rma_no &&
                          item.po_no &&
                          item.obd_no &&
                          item.status &&
                          item.status.toLowerCase() === "closed"
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow text-black">
                  <h3 className="font-semibold mb-4">Overall SQCB Status</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Open",
                              value: filteredSqcbData.filter(
                                (item) => item.status && item.status.toLowerCase() === "open"
                              ).length,
                              color: "#FCC407",
                            },
                            {
                              name: "Closed",
                              value: filteredSqcbData.filter(
                                (item) => item.status && item.status.toLowerCase() === "closed"
                              ).length,
                              color: "#1CB304",
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            {
                              name: "Open",
                              value: filteredSqcbData.filter(
                                (item) => item.status && item.status.toLowerCase() === "open"
                              ).length,
                              color: "#FCC407",
                            },
                            {
                              name: "Closed",
                              value: filteredSqcbData.filter(
                                (item) => item.status && item.status.toLowerCase() === "closed"
                              ).length,
                              color: "#1CB304",
                            },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-4 text-black">SQCB Quantity</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "New SQCB", value: newSQCBCount },
                          { name: "Waiting RMA", value: waitingRMACount },
                          { name: "Received RMA", value: receivedRMACount },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, (dataMax) => dataMax + 3]} />
                        <Tooltip />
                        <Bar dataKey="value">
                          {defectQuantityData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4 text-black">SQCB OVERVIEW DETAIL</h3>
                {renderTable(filteredSqcbData)}
              </div>
            </>
          )}

          {activeTab === "sqcbFullReport" && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">SQCB OVERVIEW DETAIL</h2>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border p-2 rounded text-black"
                  />
                  <button className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
                </div>
              </div>
              {renderTable(filteredSqcbData)}
            </div>
          )}

          {activeTab === "summaryReport" && (
            <SummaryReport data={filteredSqcbData} loading={loading} />
          )}
          {activeTab === "profileSettings" && <ProfileSettings />}
          {activeTab === "permissionManagement" && <PermissionManagement />}
        </main>
        <div className="ml-auto p-4 text-gray-500">
          <span className="text-sm">HD-SQCB </span>
          <span className="text-sm text-gray-600">Version 1.1.0001 </span>
        </div>        
      </div>

      {/* Preview Modal */}
      {selectedItem && <SupplierChargebackPreview item={selectedItem} onClose={closeItemModal} />}

      {/* Create New Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
          <div
            className="bg-gray-100 p-4 md:p-6 max-w-full md:max-w-6xl mx-auto shadow-lg rounded-lg relative overflow-auto"
            style={{ maxHeight: "100vh" }}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
              onClick={closeCreateNewItemModal}
            >
              ×
            </button>
            <div className="bg-orange-500 text-white p-2 w-full md:w-auto flex flex-col md:flex-row justify-between items-center mb-4 md:mb-0">
              <h1 className="text-white text-xl md:text-2xl font-bold mb-4 md:mb-0">
                Create New SQCB Item
              </h1>
              <div className="flex space-x-4">
                <button
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  onClick={closeCreateNewItemModal}
                  aria-label="Cancel Changes"
                >
                  Cancel
                </button>
                <button
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  onClick={handleCreateNewItem}
                >
                  Save
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700">SQCB ID</label>
                  <Input
                    id="sqcbId"
                    name="sqcbId"
                    placeholder="SQCB ID"
                    value={newItem.sqcb || ""}
                    onChange={(e) => handleInputChange(e, "sqcb")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={newItem.status || "Open"}  // "Open" can be your default
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="border p-2.5 w-[210px]"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700">RQMR No.</label>
                  <Input
                    id="rqmrNo"
                    name="rqmrNo"
                    placeholder="RQMR No."
                    value={newItem.rqmr_no || ""}
                    onChange={(e) => handleInputChange(e, "rqmr_no")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Disposition</label>
                  <select
                    id="disposition"
                    name="disposition"
                    value={newItem.disposition || "WAITING FEEDBACK"}
                    onChange={(e) => handleInputChange(e, "disposition")}
                    className="border p-2.5 w-[210px]"
                  >
                    <option value="WAITING FEEDBACK">WAITING FEEDBACK</option>
                    <option value="FEEDBACK">FEEDBACK</option>
                    <option value="WAIT RMA">WAIT RMA</option>
                    <option value="SCRAP SUPPLIER">SCRAP SUPPLIER</option>
                    <option value="RETURN TO SUPPLIER">RETURN TO SUPPLIER</option>
                    <option value="SUPPLIER REJECT">SUPPLIER REJECT</option>
                    <option value="CANCEL">CANCEL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700">Plant</label>
                  <select
                    id="plant"
                    name="plant_id"
                    value={newItem.plant_id || "3047"} // default to "3047" or as needed
                    onChange={(e) => handleInputChange(e, "plant_id")}
                    className="border p-2.5 w-[210px]"
                  >
                    <option value="3047">3047</option>
                    <option value="3048">3048</option>
                    <option value="3049">3049</option>
                    <option value="1001">1001</option>
                    <option value="1003">1003</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700">HD SQ</label>
                  <select
                    id="hdSq"
                    name="hdSq"
                    value={newItem.hd_incharge || ""}
                    onChange={(e) => setNewItem({ ...newItem, hd_incharge: e.target.value })}
                    className="border p-2.5 w-[210px]"
                  >
                    <option value="">Select Full Name</option>
                    {hdUsers.map((user) => (
                      <option key={user.user_id} value={user.fullname}>
                        {user.fullname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700">Supplier Code</label>
                  <Input
                    id="supplierCode"
                    name="supplierCode"
                    placeholder="Supplier Code"
                    value={newItem.supplier_code || ""}
                    onChange={handleSupplierCodeChange}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Supplier Name</label>
                  <Input
                    id="supplierName"
                    name="supplierName"
                    placeholder="Supplier Name"
                    value={newItem.supplier_name || ""}
                    disabled
                  />
                </div>
              </div>
              {/* Parts Info */}
              <div className="bg-white p-4 rounded overflow-x-auto" style={{ maxHeight: "500px" }}>
                <h2 className="text-lg font-semibold mb-2">Parts Information</h2>
                <table className="w-full min-w-max bg-white border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                      <th className="p-2 text-left">Item Number</th>
                      <th className="p-2 text-left">Part Number</th>
                      <th className="p-2 text-left">Part Name</th>
                      <th className="p-2 text-left">Notification</th>
                      <th className="p-2 text-left">Qty.</th>
                      <th className="p-2 text-left">Picture Attach</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newItem.parts && newItem.parts.length > 0 ? (
                      newItem.parts.map((part, index) => (
                        <tr key={part.id || index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={part.part_number || ""}
                              onChange={(e) => handlePartChange(e, index, "part_number")}
                              className="border p-1 w-full"
                              placeholder="Part Number"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={part.part_name || ""}
                              onChange={(e) => handlePartChange(e, index, "part_name")}
                              className="border p-1 w-full"
                              placeholder="Part Name"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={part.notification_number || ""}
                              onChange={(e) => handlePartChange(e, index, "notification_number")}
                              className="border p-1 w-full"
                              placeholder="Notification"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={part.qty || ""}
                              onChange={(e) => handlePartChange(e, index, "qty")}
                              className="border p-1 w-full"
                              placeholder="Quantity"
                              min="1"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(ev) => {
                                handlePartChange(ev, index, "pictures");
                                setNewItem((prev) => ({ ...prev, pictures: ev.target.files }));
                              }}
                              className="border p-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <button
                              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                              onClick={() => removePart(index)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center text-gray-500">
                          No parts available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <button
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
                  onClick={addNewPart}
                >
                  Add New Part
                </button>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700">Feedback Date</label>
                  <DatePicker
                    selected={newItem.feedback_date ? new Date(newItem.feedback_date) : null}
                    onChange={(date) => {
                      const formattedFeedback = format(date, "yyyy-MM-dd");
                      const formattedTarget = format(addDays(date, 6), "yyyy-MM-dd");
                      setNewItem({
                        ...newItem,
                        feedback_date: formattedFeedback,
                        target_date: formattedTarget,
                      });
                    }}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select Feedback Date"
                    className="p-2 border w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Target Date (+6 Working Days)</label>
                  <DatePicker
                    selected={newItem.target_date ? new Date(newItem.target_date) : null}
                    onChange={(date) => handleInputChange({ target: { value: formatDate(date) } }, "target_date")}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select Target Date"
                    className="p-2 border w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700">RMA No.</label>
                  <Input
                    id="rmaNo"
                    name="rmaNo"
                    placeholder="RMA No."
                    value={newItem.rma_no || ""}
                    onChange={(e) => handleInputChange(e, "rma_no")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Return Type</label>
                  <select
                    id="returnType"
                    name="returnType"
                    value={newItem.return_type || ""}
                    onChange={(e) => handleInputChange(e, "return_type")}
                    className="border p-1 w-full"
                  >
                    <option value="">Select Return Type</option>
                    <option value="STO">STO</option>
                    <option value="NON-STO">NON-STO</option>
                    <option value="STO-EXW">STO-EXW</option>
                    <option value="null">null</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700">QM10 Complete Date</label>
                  <DatePicker
                    selected={newItem.qm10_complete_date ? new Date(newItem.qm10_complete_date) : null}
                    onChange={(date) =>
                      handleInputChange({ target: { value: formatDate(date) } }, "qm10_complete_date")
                    }
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select QM10 Complete Date"
                    className="p-2 border w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700">DN Issued Date</label>
                  <DatePicker
                    selected={newItem.dn_issued_date ? new Date(newItem.dn_issued_date) : null}
                    onChange={(date) =>
                      handleInputChange({ target: { value: formatDate(date) } }, "dn_issued_date")
                    }
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select DN Issued Date"
                    className="p-2 border w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Scrap Week</label>
                  <Input
                    id="scrapWeek"
                    name="scrapWeek"
                    placeholder="Scrap Week"
                    value={newItem.scrap_week || ""}
                    onChange={(e) => handleInputChange(e, "scrap_week")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700">PO No.</label>
                  <Input
                    id="poNo"
                    name="poNo"
                    placeholder="PO No."
                    value={newItem.po_no || ""}
                    onChange={(e) => handleInputChange(e, "po_no")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">OBD No.</label>
                  <Input
                    id="obdNo"
                    name="obdNo"
                    placeholder="OBD No."
                    value={newItem.obd_no || ""}
                    onChange={(e) => handleInputChange(e, "obd_no")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Attachments</label>
                  <input
                    type="file"
                    id="attachments"
                    name="attachments"
                    onChange={(e) => handleInputChange(e, "attachments")}
                    multiple
                    className="border p-1 w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700">2nd PO No.</label>
                  <Input
                    id="secondPoNo"
                    name="secondPoNo"
                    placeholder="2nd PO No."
                    value={newItem.second_po_no || ""}
                    onChange={(e) => handleInputChange(e, "second_po_no")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">2nd OBD No.</label>
                  <Input
                    id="secondObdNo"
                    name="secondObdNo"
                    placeholder="2nd OBD No."
                    value={newItem.second_obd_no || ""}
                    onChange={(e) => handleInputChange(e, "second_obd_no")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-700">Comments</label>
                  <textarea
                    placeholder="Comments"
                    value={newItem.comments || ""}
                    onChange={(e) => handleInputChange(e, "comments")}
                    className="border p-2 w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <Button className="bg-gray-500" onClick={closeCreateNewItemModal}>
                Cancel
              </Button>
              <Button className="bg-indigo-500" onClick={handleCreateNewItem}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveDashboard;