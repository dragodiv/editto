"use client";

import { useState, useEffect, useRef } from "react";
import { IoCrop } from "react-icons/io5";
import { LuZoomIn, LuZoomOut } from "react-icons/lu";
import { RiText } from "react-icons/ri";
import { BiRectangle } from "react-icons/bi";
import { FaRegCircle } from "react-icons/fa6";
import { MdLensBlur, MdDelete } from "react-icons/md";
import { GoArrowDownLeft, GoPencil } from "react-icons/go";
import { HiOutlineColorSwatch } from "react-icons/hi";
import { TbArrowsMove } from "react-icons/tb";
import { FiLayers } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import Tooltip from "./components/Tooltip";
// import { useGlobalState } from "../utils/GlobalStateProvider/GlobalStateProvider";
import { motion, AnimatePresence } from "framer-motion";

function ImageEditor() {
  // const { setShowEditor } = useGlobalState();
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [cropArea, setCropArea] = useState(null);
  const [textInput, setTextInput] = useState({
    text: "",
    x: 0,
    y: 0,
    isEditing: false,
  });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [ImageUrl, setImageUrl] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [action, setAction] = useState("none"); // none, drawing, moving, resizing, rotating
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState("#6D68FF");
  const [currentOpacity, setCurrentOpacity] = useState(0.3);
  const [currentLineWidth, setCurrentLineWidth] = useState(3);
  const [currentFontSize, setCurrentFontSize] = useState(20);
  const [currentBlurRadius, setCurrentBlurRadius] = useState(10);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [layersOpen, setLayersOpen] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [showCropInstructions, setShowCropInstructions] = useState(false);

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const editorContainerRef = useRef(null);

  const selectImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  // Load image into canvas
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      img.onload = () => {
        setZoom(1);
        const canvas = canvasRef.current;
        if (canvas) {
          // Calculate appropriate canvas size based on container
          const container = editorContainerRef.current;
          if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Calculate aspect ratio
            const imgAspectRatio = img.naturalWidth / img.naturalHeight;

            // Determine canvas dimensions to fit within container while maintaining aspect ratio
            let canvasWidth, canvasHeight;

            if (
              img.naturalWidth > containerWidth ||
              img.naturalHeight > containerHeight
            ) {
              if (containerWidth / containerHeight > imgAspectRatio) {
                // Container is wider than image aspect ratio
                canvasHeight = Math.min(
                  containerHeight * 0.9,
                  img.naturalHeight
                );
                canvasWidth = canvasHeight * imgAspectRatio;
              } else {
                // Container is taller than image aspect ratio
                canvasWidth = Math.min(containerWidth * 0.9, img.naturalWidth);
                canvasHeight = canvasWidth / imgAspectRatio;
              }
            } else {
              // Image is smaller than container
              canvasWidth = img.naturalWidth;
              canvasHeight = img.naturalHeight;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            setCanvasSize({ width: canvasWidth, height: canvasHeight });

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

              // Store the original image for reset purposes
              const newImg = new Image();
              newImg.src = img.src;
              newImg.crossOrigin = "anonymous";
              setOriginalImage(newImg);
            }
          }
        }
      };
    }
  }, []);

  // Redraw canvas when zoom changes or elements change
  useEffect(() => {
    redrawCanvas();
  }, [zoom, elements, selectedElement]);

  // Focus text input when editing text
  useEffect(() => {
    if (textInput.isEditing && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.isEditing]);

  // Show crop instructions when crop tool is selected
  useEffect(() => {
    if (activeTool === "crop") {
      setShowCropInstructions(true);
      const timer = setTimeout(() => {
        setShowCropInstructions(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowCropInstructions(false);
    }
  }, [activeTool]);

  // Redraw canvas with all elements
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = originalImage;
    if (canvas && img) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw all elements
        elements.forEach((element) => {
          drawElement(ctx, element, element.id === selectedElement?.id);
        });

        // Draw current path
        if (currentPath.length > 0) {
          drawPath(ctx, currentPath, currentColor, currentLineWidth);
        }

        // Draw crop area
        if (cropArea && activeTool === "crop") {
          drawCropArea(ctx, cropArea);
        }
      }
    }
  };

  // Draw a single element
  const drawElement = (ctx, element, isSelected) => {
    // Save the current context state
    ctx.save();

    // Apply rotation if element has rotation
    if (element.rotation) {
      // Calculate center of element
      let centerX, centerY;

      if (element.type === "rectangle" || element.type === "blur") {
        centerX = element.x + element.width / 2;
        centerY = element.y + element.height / 2;
      } else if (element.type === "circle") {
        centerX = element.x + element.radius;
        centerY = element.y + element.radius;
      } else if (element.type === "arrow") {
        centerX = (element.x + element.endX) / 2;
        centerY = (element.y + element.endY) / 2;
      } else if (element.type === "text") {
        // Approximate text width based on font size and length
        const textWidth = element.text.length * (element.fontSize / 2);
        centerX = element.x + textWidth / 2;
        centerY = element.y - element.fontSize / 2;
      } else if (element.type === "drawing") {
        // Find bounding box of the drawing
        let minX = Number.POSITIVE_INFINITY,
          minY = Number.POSITIVE_INFINITY,
          maxX = 0,
          maxY = 0;
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
      }

      // Translate to center, rotate, and translate back
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = element.color || "#6D68FF";
    ctx.lineWidth = element.lineWidth || 2;
    ctx.fillStyle = `rgba(${hexToRgb(element.color || "#6D68FF")}, ${
      element.opacity || 0.3
    })`;

    switch (element.type) {
      case "rectangle":
        const rectWidth = element.width;
        const rectHeight = element.height;
        ctx.strokeRect(element.x, element.y, rectWidth, rectHeight);
        ctx.fillRect(element.x, element.y, rectWidth, rectHeight);
        break;
      case "circle":
        ctx.beginPath();
        ctx.arc(
          element.x + element.radius,
          element.y + element.radius,
          element.radius,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
        break;
      case "arrow":
        drawArrow(
          ctx,
          element.x,
          element.y,
          element.endX,
          element.endY,
          element.color
        );
        break;
      case "text":
        if (element.text) {
          ctx.font = `${element.fontSize || 20}px Arial`;
          ctx.fillStyle = element.color || "#6D68FF";
          ctx.fillText(element.text, element.x, element.y);
        }
        break;
      case "blur":
        applyBlur(
          ctx,
          element.x,
          element.y,
          element.x + element.width,
          element.y + element.height,
          element.blurRadius || 10
        );
        break;
      case "drawing":
        drawPath(ctx, element.points, element.color, element.lineWidth);
        break;
    }

    // Restore the context state
    ctx.restore();

    // Draw selection box and handles if element is selected
    if (isSelected) {
      drawSelectionBox(ctx, element);
    }
  };

  // Draw selection box and handles for selected element
  const drawSelectionBox = (ctx, element) => {
    ctx.strokeStyle = "#00AAFF";
    ctx.lineWidth = 2;

    if (element.dashedBorder) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }

    let x, y, width, height;

    if (element.type === "rectangle" || element.type === "blur") {
      x = element.x;
      y = element.y;
      width = element.width;
      height = element.height;
    } else if (element.type === "circle") {
      const diameter = element.radius * 2;
      x = element.x;
      y = element.y;
      width = diameter;
      height = diameter;
    } else if (element.type === "arrow") {
      x = Math.min(element.x, element.endX);
      y = Math.min(element.y, element.endY);
      width = Math.abs(element.endX - element.x);
      height = Math.abs(element.endY - element.y);
    } else if (element.type === "text") {
      // Approximate text width based on font size and length
      const textWidth = element.text.length * (element.fontSize / 2);
      const textHeight = element.fontSize;
      x = element.x;
      y = element.y - textHeight;
      width = textWidth;
      height = textHeight + 5;
    } else if (element.type === "drawing") {
      // Find bounding box of the drawing
      let minX = Number.POSITIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxX = 0,
        maxY = 0;
      element.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
      x = minX - 5;
      y = minY - 5;
      width = maxX - minX + 10;
      height = maxY - minY + 10;
    }

    // Save context for rotation
    ctx.save();

    if (element.rotation) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw selection box
    ctx.strokeRect(x, y, width, height);

    // Draw resize handles
    ctx.setLineDash([]);
    ctx.fillStyle = "#00AAFF";

    const handleSize = 8;

    // Corner handles for resizing
    ctx.fillRect(
      x - handleSize / 2,
      y - handleSize / 2,
      handleSize,
      handleSize
    ); // Top-left
    ctx.fillRect(
      x + width - handleSize / 2,
      y - handleSize / 2,
      handleSize,
      handleSize
    ); // Top-right
    ctx.fillRect(
      x - handleSize / 2,
      y + height - handleSize / 2,
      handleSize,
      handleSize
    ); // Bottom-left
    ctx.fillRect(
      x + width - handleSize / 2,
      y + height - handleSize / 2,
      handleSize,
      handleSize
    ); // Bottom-right

    // Middle handles for resizing
    ctx.fillRect(
      x + width / 2 - handleSize / 2,
      y - handleSize / 2,
      handleSize,
      handleSize
    ); // Top-middle
    ctx.fillRect(
      x + width - handleSize / 2,
      y + height / 2 - handleSize / 2,
      handleSize,
      handleSize
    ); // Right-middle
    ctx.fillRect(
      x + width / 2 - handleSize / 2,
      y + height - handleSize / 2,
      handleSize,
      handleSize
    ); // Bottom-middle
    ctx.fillRect(
      x - handleSize / 2,
      y + height / 2 - handleSize / 2,
      handleSize,
      handleSize
    ); // Left-middle

    // Rotation handle
    ctx.fillStyle = "#FF5500";
    ctx.beginPath();
    ctx.arc(x + width / 2, y - 20, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Line connecting rotation handle to element
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y - 20);
    ctx.stroke();

    ctx.restore();
  };

  // Convert hex color to RGB
  const hexToRgb = (hex) => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse the hex values
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);

    return `${r}, ${g}, ${b}`;
  };

  // Draw arrow
  const drawArrow = (ctx, fromX, fromY, toX, toY, color = "#6D68FF") => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // Draw a path (for free drawing)
  const drawPath = (ctx, points, color = "#6D68FF", lineWidth = 3) => {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
  };

  // Draw crop area
  const drawCropArea = (ctx, area) => {
    const width = area.endX - area.startX;
    const height = area.endY - area.startY;

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Clear the crop area
    ctx.clearRect(area.startX, area.startY, width, height);

    // Draw border around crop area
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(area.startX, area.startY, width, height);

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;

    // Vertical grid lines
    ctx.beginPath();
    ctx.moveTo(area.startX + width / 3, area.startY);
    ctx.lineTo(area.startX + width / 3, area.startY + height);
    ctx.moveTo(area.startX + (2 * width) / 3, area.startY);
    ctx.lineTo(area.startX + (2 * width) / 3, area.startY + height);
    ctx.stroke();

    // Horizontal grid lines
    ctx.beginPath();
    ctx.moveTo(area.startX, area.startY + height / 3);
    ctx.lineTo(area.startX + width, area.startY + height / 3);
    ctx.moveTo(area.startX, area.startY + (2 * height) / 3);
    ctx.lineTo(area.startX + width, area.startY + (2 * height) / 3);
    ctx.stroke();

    // Draw handles
    const handleSize = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    // Corner handles
    ctx.beginPath();
    ctx.rect(
      area.startX - handleSize / 2,
      area.startY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.endX - handleSize / 2,
      area.startY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.startX - handleSize / 2,
      area.endY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.endX - handleSize / 2,
      area.endY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fill();
    ctx.stroke();

    // Middle handles
    ctx.beginPath();
    ctx.rect(
      area.startX + width / 2 - handleSize / 2,
      area.startY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.endX - handleSize / 2,
      area.startY + height / 2 - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.startX + width / 2 - handleSize / 2,
      area.endY - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.rect(
      area.startX - handleSize / 2,
      area.startY + height / 2 - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fill();
    ctx.stroke();

    // Display dimensions
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${Math.abs(Math.round(width))} × ${Math.abs(Math.round(height))}`,
      area.startX + width / 2,
      area.startY - 10
    );
  };

  // Apply blur effect to a region
  const applyBlur = (ctx, startX, startY, endX, endY, radius) => {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Get the image data from the region
    const imageData = ctx.getImageData(x, y, width, height);

    // Apply a simple box blur (for demonstration)
    const pixels = imageData.data;
    const tempPixels = new Uint8ClampedArray(pixels);

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        let count = 0;

        // Simple box blur
        for (let y = -radius; y <= radius; y++) {
          for (let x = -radius; x <= radius; x++) {
            const pixelX = j + x;
            const pixelY = i + y;

            if (
              pixelX >= 0 &&
              pixelX < width &&
              pixelY >= 0 &&
              pixelY < height
            ) {
              const index = (pixelY * width + pixelX) * 4;
              r += tempPixels[index];
              g += tempPixels[index + 1];
              b += tempPixels[index + 2];
              a += tempPixels[index + 3];
              count++;
            }
          }
        }

        const index = (i * width + j) * 4;
        pixels[index] = r / count;
        pixels[index + 1] = g / count;
        pixels[index + 2] = b / count;
        pixels[index + 3] = a / count;
      }
    }

    ctx.putImageData(imageData, x, y);
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(prevZoom + 0.1, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(prevZoom - 0.1, 0.5));
  };

  // Handle tool selection
  const handleToolSelect = (tool) => {
    setActiveTool(tool);
    setSelectedElement(null);

    // Reset text input if switching from text tool
    if (activeTool === "text" && textInput.isEditing) {
      finishTextInput();
    }
  };

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: ((e.clientX - rect.left) * scaleX) / zoom,
      y: ((e.clientY - rect.top) * scaleY) / zoom,
    };
  };

  // Check if mouse is over a resize handle
  const getResizeHandleAtPosition = (x, y, element) => {
    if (!element) return null;

    let elementX, elementY, elementWidth, elementHeight;

    if (element.type === "rectangle" || element.type === "blur") {
      elementX = element.x;
      elementY = element.y;
      elementWidth = element.width;
      elementHeight = element.height;
    } else if (element.type === "circle") {
      elementX = element.x;
      elementY = element.y;
      elementWidth = element.radius * 2;
      elementHeight = element.radius * 2;
    } else if (element.type === "arrow") {
      elementX = Math.min(element.x, element.endX);
      elementY = Math.min(element.y, element.endY);
      elementWidth = Math.abs(element.endX - element.x);
      elementHeight = Math.abs(element.endY - element.y);
    } else if (element.type === "text") {
      const textWidth = element.text.length * (element.fontSize / 2);
      const textHeight = element.fontSize;
      elementX = element.x;
      elementY = element.y - textHeight;
      elementWidth = textWidth;
      elementHeight = textHeight + 5;
    } else if (element.type === "drawing") {
      let minX = Number.POSITIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxX = 0,
        maxY = 0;
      element.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
      elementX = minX - 5;
      elementY = minY - 5;
      elementWidth = maxX - minX + 10;
      elementHeight = maxY - minY + 10;
    }

    // Apply rotation transformation to mouse coordinates if element is rotated
    let checkX = x;
    let checkY = y;

    if (element.rotation) {
      const centerX = elementX + elementWidth / 2;
      const centerY = elementY + elementHeight / 2;

      // Translate to origin
      const translatedX = x - centerX;
      const translatedY = y - centerY;

      // Rotate in the opposite direction
      const angle = (-element.rotation * Math.PI) / 180;
      const rotatedX =
        translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
      const rotatedY =
        translatedX * Math.sin(angle) + translatedY * Math.cos(angle);

      // Translate back
      checkX = rotatedX + centerX;
      checkY = rotatedY + centerY;
    }

    const handleSize = 10; // Increased handle size
    const handleHitArea = handleSize * 1.5; // Larger hit area for easier selection

    // Check rotation handle
    const rotationHandleX = elementX + elementWidth / 2;
    const rotationHandleY = elementY - 20;

    if (
      Math.abs(checkX - rotationHandleX) < handleHitArea / 2 &&
      Math.abs(checkY - rotationHandleY) < handleHitArea / 2
    ) {
      return "rotation";
    }

    // Check corner handles
    if (
      Math.abs(checkX - elementX) < handleHitArea / 2 &&
      Math.abs(checkY - elementY) < handleHitArea / 2
    ) {
      return "top-left";
    }

    if (
      Math.abs(checkX - (elementX + elementWidth)) < handleHitArea / 2 &&
      Math.abs(checkY - elementY) < handleHitArea / 2
    ) {
      return "top-right";
    }

    if (
      Math.abs(checkX - elementX) < handleHitArea / 2 &&
      Math.abs(checkY - (elementY + elementHeight)) < handleHitArea / 2
    ) {
      return "bottom-left";
    }

    if (
      Math.abs(checkX - (elementX + elementWidth)) < handleHitArea / 2 &&
      Math.abs(checkY - (elementY + elementHeight)) < handleHitArea / 2
    ) {
      return "bottom-right";
    }

    // Check middle handles
    if (
      Math.abs(checkX - (elementX + elementWidth / 2)) < handleHitArea / 2 &&
      Math.abs(checkY - elementY) < handleHitArea / 2
    ) {
      return "top-middle";
    }

    if (
      Math.abs(checkX - (elementX + elementWidth)) < handleHitArea / 2 &&
      Math.abs(checkY - (elementY + elementHeight / 2)) < handleHitArea / 2
    ) {
      return "right-middle";
    }

    if (
      Math.abs(checkX - (elementX + elementWidth / 2)) < handleHitArea / 2 &&
      Math.abs(checkY - (elementY + elementHeight)) < handleHitArea / 2
    ) {
      return "bottom-middle";
    }

    if (
      Math.abs(checkX - elementX) < handleHitArea / 2 &&
      Math.abs(checkY - (elementY + elementHeight / 2)) < handleHitArea / 2
    ) {
      return "left-middle";
    }

    return null;
  };

  // Check if mouse is over an element
  const getElementAtPosition = (x, y) => {
    // Check elements in reverse order (top to bottom in layers)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];

      // First check if we're over a resize handle of the selected element
      if (selectedElement && selectedElement.id === element.id) {
        const handle = getResizeHandleAtPosition(x, y, element);
        if (handle) {
          return element;
        }
      }

      // Apply inverse rotation to check if point is inside rotated element
      let checkX = x;
      let checkY = y;

      if (element.rotation) {
        let centerX, centerY;

        if (element.type === "rectangle" || element.type === "blur") {
          centerX = element.x + element.width / 2;
          centerY = element.y + element.height / 2;
        } else if (element.type === "circle") {
          centerX = element.x + element.radius;
          centerY = element.y + element.radius;
        } else if (element.type === "arrow") {
          centerX = (element.x + element.endX) / 2;
          centerY = (element.y + element.endY) / 2;
        } else if (element.type === "text") {
          const textWidth = element.text.length * (element.fontSize / 2);
          centerX = element.x + textWidth / 2;
          centerY = element.y - element.fontSize / 2;
        } else if (element.type === "drawing") {
          let minX = Number.POSITIVE_INFINITY,
            minY = Number.POSITIVE_INFINITY,
            maxX = 0,
            maxY = 0;
          element.points.forEach((point) => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
          });
          centerX = (minX + maxX) / 2;
          centerY = (minY + maxY) / 2;
        }

        // Translate to origin
        const translatedX = x - centerX;
        const translatedY = y - centerY;

        // Rotate in the opposite direction
        const angle = (-element.rotation * Math.PI) / 180;
        const rotatedX =
          translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
        const rotatedY =
          translatedX * Math.sin(angle) + translatedY * Math.cos(angle);

        // Translate back
        checkX = rotatedX + centerX;
        checkY = rotatedY + centerY;
      }

      if (element.type === "rectangle" || element.type === "blur") {
        if (
          checkX >= element.x &&
          checkX <= element.x + element.width &&
          checkY >= element.y &&
          checkY <= element.y + element.height
        ) {
          return element;
        }
      } else if (element.type === "circle") {
        const dx = checkX - (element.x + element.radius);
        const dy = checkY - (element.y + element.radius);
        if (dx * dx + dy * dy <= element.radius * element.radius) {
          return element;
        }
      } else if (element.type === "arrow") {
        // Simplified hit detection for arrow (bounding box)
        const minX = Math.min(element.x, element.endX);
        const maxX = Math.max(element.x, element.endX);
        const minY = Math.min(element.y, element.endY);
        const maxY = Math.max(element.y, element.endY);

        if (
          checkX >= minX &&
          checkX <= maxX &&
          checkY >= minY &&
          checkY <= maxY
        ) {
          return element;
        }
      } else if (element.type === "text") {
        // Approximate text width based on font size and length
        const textWidth = element.text.length * (element.fontSize / 2);
        const textHeight = element.fontSize;

        if (
          checkX >= element.x &&
          checkX <= element.x + textWidth &&
          checkY >= element.y - textHeight &&
          checkY <= element.y
        ) {
          return element;
        }
      } else if (element.type === "drawing") {
        // Find bounding box of the drawing
        let minX = Number.POSITIVE_INFINITY,
          minY = Number.POSITIVE_INFINITY,
          maxX = 0,
          maxY = 0;
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });

        if (
          checkX >= minX &&
          checkX <= maxX &&
          checkY >= minY &&
          checkY <= maxY
        ) {
          return element;
        }
      }
    }

    return null;
  };

  // Handle mouse down on canvas
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;

    const { x, y } = getMousePos(e);
    setStartPos({ x, y });

    if (activeTool === "select") {
      const element = getElementAtPosition(x, y);

      if (element) {
        setSelectedElement(element);

        // Check if we're clicking on a resize handle
        const handle = getResizeHandleAtPosition(x, y, element);

        if (handle) {
          setResizeHandle(handle);
          if (handle === "rotation") {
            setAction("rotating");
          } else {
            setAction("resizing");
          }
        } else {
          setAction("moving");
        }
      } else {
        setSelectedElement(null);
      }
    } else if (activeTool === "draw") {
      setAction("drawing");
      setCurrentPath([{ x, y }]);
    } else if (activeTool === "text") {
      // Create a new text element immediately
      const newTextElement = {
        id: uuidv4(),
        type: "text",
        x,
        y,
        text: "Double-click to edit",
        fontSize: currentFontSize,
        color: currentColor,
        rotation: 0,
        name: `Text ${elements.length + 1}`,
      };

      setElements((prev) => [...prev, newTextElement]);
      setSelectedElement(newTextElement);
      setActiveTool("select"); // Switch to select tool after adding text
    } else if (
      activeTool === "crop" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "arrow" ||
      activeTool === "blur"
    ) {
      setAction("drawing");

      if (activeTool === "crop") {
        setCropArea({ startX: x, startY: y, endX: x, endY: y });
      }
    }
  };

  // Handle mouse move on canvas
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;

    const { x, y } = getMousePos(e);

    // Update cursor based on what's under the mouse
    if (activeTool === "select" && !action) {
      const element = getElementAtPosition(x, y);

      if (element) {
        const handle = getResizeHandleAtPosition(x, y, element);

        if (handle) {
          if (handle === "rotation") {
            canvasRef.current.style.cursor = "grab";
          } else if (handle === "top-left" || handle === "bottom-right") {
            canvasRef.current.style.cursor = "nwse-resize";
          } else if (handle === "top-right" || handle === "bottom-left") {
            canvasRef.current.style.cursor = "nesw-resize";
          } else if (handle === "top-middle" || handle === "bottom-middle") {
            canvasRef.current.style.cursor = "ns-resize";
          } else if (handle === "left-middle" || handle === "right-middle") {
            canvasRef.current.style.cursor = "ew-resize";
          }
        } else {
          canvasRef.current.style.cursor = "move";
        }
      } else {
        canvasRef.current.style.cursor = "default";
      }
    }

    if (action === "drawing") {
      if (activeTool === "draw") {
        setCurrentPath((prev) => [...prev, { x, y }]);
        redrawCanvas();
      } else if (activeTool === "crop" && cropArea) {
        setCropArea({ ...cropArea, endX: x, endY: y });
        redrawCanvas();
      } else if (
        (activeTool === "rectangle" ||
          activeTool === "circle" ||
          activeTool === "arrow" ||
          activeTool === "blur") &&
        startPos
      ) {
        redrawCanvas();

        // Draw preview of the shape
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          if (activeTool === "rectangle") {
            const width = x - startPos.x;
            const height = y - startPos.y;

            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.fillStyle = `rgba(${hexToRgb(
              currentColor
            )}, ${currentOpacity})`;

            ctx.strokeRect(startPos.x, startPos.y, width, height);
            ctx.fillRect(startPos.x, startPos.y, width, height);
          } else if (activeTool === "circle") {
            const dx = x - startPos.x;
            const dy = y - startPos.y;
            const radius = Math.sqrt(dx * dx + dy * dy);

            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.fillStyle = `rgba(${hexToRgb(
              currentColor
            )}, ${currentOpacity})`;

            ctx.beginPath();
            ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else if (activeTool === "arrow") {
            drawArrow(ctx, startPos.x, startPos.y, x, y, currentColor);
          } else if (activeTool === "blur") {
            const width = x - startPos.x;
            const height = y - startPos.y;

            // Draw a rectangle to show the blur area
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.strokeRect(startPos.x, startPos.y, width, height);

            // Add text to indicate blur
            ctx.fillStyle = currentColor;
            ctx.font = "12px Arial";
            ctx.fillText("Blur Area", startPos.x + 5, startPos.y + 15);
          }
        }
      }
    } else if (action === "moving" && selectedElement) {
      const dx = x - startPos.x;
      const dy = y - startPos.y;

      setElements((prevElements) =>
        prevElements.map((el) => {
          if (el.id === selectedElement.id) {
            if (
              el.type === "rectangle" ||
              el.type === "circle" ||
              el.type === "blur" ||
              el.type === "text"
            ) {
              return {
                ...el,
                x: el.x + dx,
                y: el.y + dy,
              };
            } else if (el.type === "arrow") {
              return {
                ...el,
                x: el.x + dx,
                y: el.y + dy,
                endX: el.endX + dx,
                endY: el.endY + dy,
              };
            } else if (el.type === "drawing") {
              return {
                ...el,
                points: el.points.map((point) => ({
                  x: point.x + dx,
                  y: point.y + dy,
                })),
              };
            }
          }
          return el;
        })
      );

      setStartPos({ x, y });
      setSelectedElement((prev) => {
        if (
          prev.type === "rectangle" ||
          prev.type === "circle" ||
          prev.type === "blur" ||
          prev.type === "text"
        ) {
          return {
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
          };
        } else if (prev.type === "arrow") {
          return {
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
            endX: prev.endX + dx,
            endY: prev.endY + dy,
          };
        } else if (prev.type === "drawing") {
          return {
            ...prev,
            points: prev.points.map((point) => ({
              x: point.x + dx,
              y: point.y + dy,
            })),
          };
        }
        return prev;
      });
    } else if (action === "resizing" && selectedElement && resizeHandle) {
      // Calculate changes based on the handle being dragged
      let newElement = { ...selectedElement };

      // For rotated elements, we need to transform the mouse coordinates
      let resizeX = x;
      let resizeY = y;

      if (selectedElement.rotation) {
        // Get the center of the element
        let centerX, centerY;

        if (
          selectedElement.type === "rectangle" ||
          selectedElement.type === "blur"
        ) {
          centerX = selectedElement.x + selectedElement.width / 2;
          centerY = selectedElement.y + selectedElement.height / 2;
        } else if (selectedElement.type === "circle") {
          centerX = selectedElement.x + selectedElement.radius;
          centerY = selectedElement.y + selectedElement.radius;
        } else if (selectedElement.type === "arrow") {
          centerX = (selectedElement.x + selectedElement.endX) / 2;
          centerY = (selectedElement.y + selectedElement.endY) / 2;
        } else if (selectedElement.type === "text") {
          const textWidth =
            selectedElement.text.length * (selectedElement.fontSize / 2);
          centerX = selectedElement.x + textWidth / 2;
          centerY = selectedElement.y - selectedElement.fontSize / 2;
        }

        // Translate to origin
        const translatedX = x - centerX;
        const translatedY = y - centerY;

        // Rotate in the opposite direction
        const angle = (-selectedElement.rotation * Math.PI) / 180;
        const rotatedX =
          translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
        const rotatedY =
          translatedX * Math.sin(angle) + translatedY * Math.cos(angle);

        // Translate back
        resizeX = rotatedX + centerX;
        resizeY = rotatedY + centerY;
      }

      if (
        selectedElement.type === "rectangle" ||
        selectedElement.type === "blur"
      ) {
        const { x, y, width, height } = selectedElement;

        switch (resizeHandle) {
          case "top-left":
            newElement = {
              ...newElement,
              x: resizeX,
              y: resizeY,
              width: width + (x - resizeX),
              height: height + (y - resizeY),
            };
            break;
          case "top-right":
            newElement = {
              ...newElement,
              y: resizeY,
              width: resizeX - x,
              height: height + (y - resizeY),
            };
            break;
          case "bottom-left":
            newElement = {
              ...newElement,
              x: resizeX,
              width: width + (x - resizeX),
              height: resizeY - y,
            };
            break;
          case "bottom-right":
            newElement = {
              ...newElement,
              width: resizeX - x,
              height: resizeY - y,
            };
            break;
          case "top-middle":
            newElement = {
              ...newElement,
              y: resizeY,
              height: height + (y - resizeY),
            };
            break;
          case "right-middle":
            newElement = {
              ...newElement,
              width: resizeX - x,
            };
            break;
          case "bottom-middle":
            newElement = {
              ...newElement,
              height: resizeY - y,
            };
            break;
          case "left-middle":
            newElement = {
              ...newElement,
              x: resizeX,
              width: width + (x - resizeX),
            };
            break;
        }

        // Ensure width and height are positive
        if (newElement.width < 0) {
          newElement.x = newElement.x + newElement.width;
          newElement.width = Math.abs(newElement.width);
        }

        if (newElement.height < 0) {
          newElement.y = newElement.y + newElement.height;
          newElement.height = Math.abs(newElement.height);
        }

        // Enforce minimum size
        newElement.width = Math.max(10, newElement.width);
        newElement.height = Math.max(10, newElement.height);
      } else if (selectedElement.type === "circle") {
        // For circle, we adjust the radius based on the distance from center
        const centerX = selectedElement.x + selectedElement.radius;
        const centerY = selectedElement.y + selectedElement.radius;

        const dx = resizeX - centerX;
        const dy = resizeY - centerY;
        const newRadius = Math.max(10, Math.sqrt(dx * dx + dy * dy));

        newElement = {
          ...newElement,
          x: centerX - newRadius,
          y: centerY - newRadius,
          radius: newRadius,
        };
      } else if (selectedElement.type === "arrow") {
        // For arrow, we adjust the end points
        switch (resizeHandle) {
          case "top-left":
          case "left-middle":
          case "bottom-left":
            newElement = {
              ...newElement,
              x: resizeX,
            };
            break;
          case "top-right":
          case "right-middle":
          case "bottom-right":
            newElement = {
              ...newElement,
              endX: resizeX,
            };
            break;
        }

        switch (resizeHandle) {
          case "top-left":
          case "top-middle":
          case "top-right":
            newElement = {
              ...newElement,
              y: resizeY,
            };
            break;
          case "bottom-left":
          case "bottom-middle":
          case "bottom-right":
            newElement = {
              ...newElement,
              endY: resizeY,
            };
            break;
        }
      } else if (selectedElement.type === "text") {
        // For text, we adjust the font size proportionally
        const scaleFactor = Math.max(
          0.5,
          Math.min(2, 1 + (resizeY - startPos.y) / 100)
        );

        newElement = {
          ...newElement,
          fontSize: Math.max(
            10,
            Math.min(72, selectedElement.fontSize * scaleFactor)
          ),
        };
      }

      // Update the element in the elements array
      setElements((prevElements) =>
        prevElements.map((el) =>
          el.id === selectedElement.id ? newElement : el
        )
      );

      // Update the selected element
      setSelectedElement(newElement);
      setStartPos({ x, y });
    } else if (action === "rotating" && selectedElement) {
      // Calculate the center of the element
      let centerX, centerY;

      if (
        selectedElement.type === "rectangle" ||
        selectedElement.type === "blur"
      ) {
        centerX = selectedElement.x + selectedElement.width / 2;
        centerY = selectedElement.y + selectedElement.height / 2;
      } else if (selectedElement.type === "circle") {
        centerX = selectedElement.x + selectedElement.radius;
        centerY = selectedElement.y + selectedElement.radius;
      } else if (selectedElement.type === "arrow") {
        centerX = (selectedElement.x + selectedElement.endX) / 2;
        centerY = (selectedElement.y + selectedElement.endY) / 2;
      } else if (selectedElement.type === "text") {
        const textWidth =
          selectedElement.text.length * (selectedElement.fontSize / 2);
        centerX = selectedElement.x + textWidth / 2;
        centerY = selectedElement.y - selectedElement.fontSize / 2;
      } else if (selectedElement.type === "drawing") {
        let minX = Number.POSITIVE_INFINITY,
          minY = Number.POSITIVE_INFINITY,
          maxX = 0,
          maxY = 0;
        selectedElement.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
      }

      // Calculate the angle between the center and the current mouse position
      const angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;

      // Calculate the angle between the center and the start position
      const startAngle =
        (Math.atan2(startPos.y - centerY, startPos.x - centerX) * 180) /
        Math.PI;

      // Calculate the rotation change
      const rotationChange = angle - startAngle;

      // Update the element's rotation
      const newRotation =
        ((selectedElement.rotation || 0) + rotationChange) % 360;

      // Update the element in the elements array
      setElements((prevElements) =>
        prevElements.map((el) =>
          el.id === selectedElement.id ? { ...el, rotation: newRotation } : el
        )
      );

      // Update the selected element
      setSelectedElement((prev) => ({
        ...prev,
        rotation: newRotation,
      }));

      setStartPos({ x, y });
    }
  };

  // Handle mouse up on canvas
  const handleMouseUp = (e) => {
    if (!canvasRef.current) return;

    const { x, y } = getMousePos(e);

    if (action === "drawing") {
      if (activeTool === "draw" && currentPath.length > 1) {
        const newElement = {
          id: uuidv4(),
          type: "drawing",
          points: [...currentPath, { x, y }],
          color: currentColor,
          lineWidth: currentLineWidth,
          rotation: 0,
          name: `Drawing ${elements.length + 1}`,
        };

        setElements((prev) => [...prev, newElement]);
        setCurrentPath([]);
      } else if (
        (activeTool === "rectangle" || activeTool === "blur") &&
        startPos
      ) {
        const width = x - startPos.x;
        const height = y - startPos.y;

        // Only add if it has some size
        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
          const newElement = {
            id: uuidv4(),
            type: activeTool,
            x: startPos.x,
            y: startPos.y,
            width: width,
            height: height,
            color: currentColor,
            opacity: currentOpacity,
            lineWidth: currentLineWidth,
            blurRadius: currentBlurRadius,
            rotation: 0,
            name: `${activeTool === "rectangle" ? "Rectangle" : "Blur"} ${
              elements.length + 1
            }`,
          };

          setElements((prev) => [...prev, newElement]);

          // Switch to select tool and select the new element
          setSelectedElement(newElement);
          setActiveTool("select");
        }
      } else if (activeTool === "circle" && startPos) {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        // Only add if it has some size
        if (radius > 5) {
          const newElement = {
            id: uuidv4(),
            type: "circle",
            x: startPos.x - radius,
            y: startPos.y - radius,
            radius,
            color: currentColor,
            opacity: currentOpacity,
            lineWidth: currentLineWidth,
            rotation: 0,
            name: `Circle ${elements.length + 1}`,
          };

          setElements((prev) => [...prev, newElement]);

          // Switch to select tool and select the new element
          setSelectedElement(newElement);
          setActiveTool("select");
        }
      } else if (activeTool === "arrow" && startPos) {
        // Only add if it has some length
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
          const newElement = {
            id: uuidv4(),
            type: "arrow",
            x: startPos.x,
            y: startPos.y,
            endX: x,
            endY: y,
            color: currentColor,
            lineWidth: currentLineWidth,
            rotation: 0,
            name: `Arrow ${elements.length + 1}`,
          };

          setElements((prev) => [...prev, newElement]);

          // Switch to select tool and select the new element
          setSelectedElement(newElement);
          setActiveTool("select");
        }
      }
    }

    setAction("none");
    setResizeHandle(null);
    redrawCanvas();
  };

  // Handle double click for editing text
  const handleDoubleClick = (e) => {
    if (!canvasRef.current) return;

    const { x, y } = getMousePos(e);
    const element = getElementAtPosition(x, y);

    if (element && element.type === "text") {
      setTextInput({
        text: element.text,
        x: element.x,
        y: element.y,
        isEditing: true,
        elementId: element.id,
      });
    }
  };

  // Handle text input change
  const handleTextChange = (e) => {
    setTextInput((prev) => ({ ...prev, text: e.target.value }));
  };

  // Finish text input and add it to elements
  const finishTextInput = () => {
    if (textInput.text.trim()) {
      if (textInput.elementId) {
        // Update existing text element
        setElements((prevElements) =>
          prevElements.map((el) =>
            el.id === textInput.elementId ? { ...el, text: textInput.text } : el
          )
        );

        // Update selected element if it's the one being edited
        if (selectedElement && selectedElement.id === textInput.elementId) {
          setSelectedElement((prev) => ({
            ...prev,
            text: textInput.text,
          }));
        }
      } else {
        // Create new text element
        const newElement = {
          id: uuidv4(),
          type: "text",
          x: textInput.x,
          y: textInput.y,
          text: textInput.text,
          fontSize: currentFontSize,
          color: currentColor,
          rotation: 0,
          name: `Text ${elements.length + 1}`,
        };

        setElements((prev) => [...prev, newElement]);
      }
    }

    setTextInput((prev) => ({
      ...prev,
      text: "",
      isEditing: false,
      elementId: null,
    }));
    redrawCanvas();
  };

  // Handle key press in text input
  const handleTextKeyPress = (e) => {
    if (e.key === "Enter") {
      finishTextInput();
    }
  };

  // Apply crop to the image
  const applyCrop = () => {
    if (!cropArea || !canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const width = Math.abs(cropArea.endX - cropArea.startX);
      const height = Math.abs(cropArea.endY - cropArea.startY);
      const startX = Math.min(cropArea.startX, cropArea.endX);
      const startY = Math.min(cropArea.startY, cropArea.endY);

      // Create a temporary canvas for the cropped image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      if (tempCtx) {
        // Draw the cropped portion to the temp canvas
        tempCtx.drawImage(
          canvas,
          startX,
          startY,
          width,
          height,
          0,
          0,
          width,
          height
        );

        // Resize the main canvas to the crop size
        canvas.width = width;
        canvas.height = height;

        // Draw the cropped image back to the main canvas
        ctx.drawImage(tempCanvas, 0, 0);

        // Update the original image
        const newImg = new Image();
        newImg.src = canvas.toDataURL("image/png");
        newImg.crossOrigin = "anonymous";
        setOriginalImage(newImg);

        // Reset crop area and elements
        setCropArea(null);
        setElements([]);
        setActiveTool("select");
        setCanvasSize({ width, height });
      }
    }
  };

  // Delete selected element
  const deleteSelectedElement = () => {
    if (selectedElement) {
      setElements((prevElements) =>
        prevElements.filter((el) => el.id !== selectedElement.id)
      );
      setSelectedElement(null);
    }
  };

  // Update element properties
  const updateElementProperty = (property, value) => {
    if (!selectedElement) return;

    setElements((prevElements) =>
      prevElements.map((el) => {
        if (el.id === selectedElement.id) {
          return {
            ...el,
            [property]: value,
          };
        }
        return el;
      })
    );

    setSelectedElement((prev) => ({
      ...prev,
      [property]: value,
    }));
  };

  // Save the edited image and element data
  const handleSave = () => {
    if (!canvasRef.current) return;

    setSelectedElement(null);

    // If we're in crop mode, apply the crop first
    if (activeTool === "crop" && cropArea) {
      applyCrop();
      return; // Return early as applyCrop will reset the state
    }

    // Get the final image as a data URL
    const dataUrl = canvasRef.current.toDataURL("image/png");

    // Prepare the JSON data of all elements
    const elementsData = elements.map((element) => {
      // Create a clean copy without circular references
      const { id, type, name, ...props } = element;
      return { id, type, name, ...props };
    });

    // Log the JSON data to console
    // console.log(JSON.stringify(elementsData, null, 2));

    if (selectedElement !== null) setSelectedElement(null);

    // Create a download link for the image
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = dataUrl;
    link.click();

    // You could also send this data to your backend
    // alert("Image saved! Check console for element data JSON.");
  };

  // Render property controls based on selected element
  const renderPropertyControls = () => {
    if (!selectedElement) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-[#3A3A3A] p-3 rounded-lg shadow-lg"
      >
        <h3 className="text-white font-medium mb-2">Element Properties</h3>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-white text-sm">Name:</label>
            <input
              type="text"
              value={selectedElement.name || ""}
              onChange={(e) => updateElementProperty("name", e.target.value)}
              className="bg-[#2E2E2E] text-white text-sm rounded px-2 py-1 w-32"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-white text-sm">Color:</label>
            <input
              type="color"
              value={selectedElement.color || "#6D68FF"}
              onChange={(e) => updateElementProperty("color", e.target.value)}
              className="bg-transparent w-8 h-8 cursor-pointer"
            />
          </div>

          {(selectedElement.type === "rectangle" ||
            selectedElement.type === "circle" ||
            selectedElement.type === "blur") && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Opacity:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedElement.opacity || 0.3}
                onChange={(e) =>
                  updateElementProperty(
                    "opacity",
                    Number.parseFloat(e.target.value)
                  )
                }
                className="w-32"
              />
            </div>
          )}

          {(selectedElement.type === "rectangle" ||
            selectedElement.type === "circle" ||
            selectedElement.type === "arrow" ||
            selectedElement.type === "drawing") && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Line Width:</label>
              <input
                type="range"
                min="1"
                max="10"
                value={selectedElement.lineWidth || 2}
                onChange={(e) =>
                  updateElementProperty(
                    "lineWidth",
                    Number.parseInt(e.target.value)
                  )
                }
                className="w-32"
              />
            </div>
          )}

          {selectedElement.type === "text" && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Font Size:</label>
              <input
                type="range"
                min="10"
                max="72"
                value={selectedElement.fontSize || 20}
                onChange={(e) =>
                  updateElementProperty(
                    "fontSize",
                    Number.parseInt(e.target.value)
                  )
                }
                className="w-32"
              />
            </div>
          )}

          {selectedElement.type === "blur" && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Blur Radius:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={selectedElement.blurRadius || 10}
                onChange={(e) =>
                  updateElementProperty(
                    "blurRadius",
                    Number.parseInt(e.target.value)
                  )
                }
                className="w-32"
              />
            </div>
          )}

          {selectedElement.type === "text" && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Text:</label>
              <input
                type="text"
                value={selectedElement.text || ""}
                onChange={(e) => updateElementProperty("text", e.target.value)}
                className="bg-[#2E2E2E] text-white text-sm rounded px-2 py-1 w-32"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-white text-sm">Rotation:</label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedElement.rotation || 0}
              onChange={(e) =>
                updateElementProperty(
                  "rotation",
                  Number.parseInt(e.target.value)
                )
              }
              className="w-32"
            />
          </div>

          {selectedElement && (
            <div className="flex items-center justify-between">
              <label className="text-white text-sm">Dashed Border:</label>
              <input
                type="checkbox"
                checked={selectedElement.dashedBorder || false}
                onChange={(e) =>
                  updateElementProperty("dashedBorder", e.target.checked)
                }
                className="w-4 h-4 accent-[#6D68FF]"
              />
            </div>
          )}

          <button
            onClick={deleteSelectedElement}
            className="bg-red-500 text-white cursor-pointer rounded-lg p-1 mt-2 flex items-center justify-center gap-1 text-sm"
          >
            <MdDelete className="size-4" /> Delete
          </button>
        </div>
      </motion.div>
    );
  };

  // Render layers panel
  const renderLayersPanel = () => {
    if (!layersOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="absolute right-4 bottom-16 bg-[#3A3A3A] p-3 rounded-lg w-48 max-h-60 overflow-y-auto shadow-lg"
      >
        <h3 className="text-white font-medium mb-2">Layers</h3>

        {elements.length === 0 ? (
          <p className="text-gray-400 text-sm">No elements added yet</p>
        ) : (
          <div className="grid gap-1">
            {elements.map((element, index) => (
              <motion.div
                key={element.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-1 rounded cursor-pointer ${
                  selectedElement?.id === element.id
                    ? "bg-[#5a57c0]"
                    : "hover:bg-[#4A4A4A]"
                }`}
                onClick={() => setSelectedElement(element)}
              >
                <span className="text-white text-sm truncate">
                  {element.name || `${element.type} ${index + 1}`}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setElements((prev) =>
                      prev.filter((el) => el.id !== element.id)
                    );
                    if (selectedElement?.id === element.id) {
                      setSelectedElement(null);
                    }
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <MdDelete className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="bg-[#2E2E2E]  h-[100vh] w-[100vw] overflow-hidden smoothness transition-all duration-200 figtree flex flex-col">
      {ImageUrl && (
        <div className="bg-[#6D68FFB2] text-white flex justify-between items-center p-4 px-6">
          <div className="flex gap-3 w-[180px]">
            <Tooltip text="Zoom Out">
              <button onClick={handleZoomOut} className="cursor-pointer">
                <LuZoomOut className="size-5" />
              </button>
            </Tooltip>
            <Tooltip text="Zoom In">
              <button onClick={handleZoomIn}>
                <LuZoomIn className="size-5" />
              </button>
            </Tooltip>
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex gap-3 items-center justify-center mx-auto w-full">
            <Tooltip text="Select">
              <button
                onClick={() => handleToolSelect("select")}
                className={
                  activeTool === "select"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <TbArrowsMove className="size-[22px]" />
              </button>
            </Tooltip>
            {/* <Tooltip text="Crop">
              <button
                onClick={() => handleToolSelect("crop")}
                className={
                  activeTool === "crop"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <IoCrop className="size-[22px]" />
              </button>
            </Tooltip> */}
            <Tooltip text="Text">
              <button
                onClick={() => handleToolSelect("text")}
                className={
                  activeTool === "text"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <RiText className="size-5" />
              </button>
            </Tooltip>
            <Tooltip text="Rectangle">
              <button
                onClick={() => handleToolSelect("rectangle")}
                className={
                  activeTool === "rectangle"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <BiRectangle className="size-5" />
              </button>
            </Tooltip>
            <Tooltip text="Circle">
              <button
                onClick={() => handleToolSelect("circle")}
                className={
                  activeTool === "circle"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <FaRegCircle className="size-[18px]" />
              </button>
            </Tooltip>
            <Tooltip text="Arrow">
              <button
                onClick={() => handleToolSelect("arrow")}
                className={
                  activeTool === "arrow"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <GoArrowDownLeft className="size-5" />
              </button>
            </Tooltip>
            <Tooltip text="Blur">
              <button
                onClick={() => handleToolSelect("blur")}
                className={
                  activeTool === "blur"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <MdLensBlur className="size-6" />
              </button>
            </Tooltip>
            <Tooltip text="Draw">
              <button
                onClick={() => handleToolSelect("draw")}
                className={
                  activeTool === "draw"
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded"
                }
              >
                <GoPencil className="size-[18px]" />
              </button>
            </Tooltip>
            <Tooltip text="Color">
              <div className="relative">
                <button
                  onClick={() => setColorPickerOpen(!colorPickerOpen)}
                  className="flex items-center gap-3"
                >
                  <HiOutlineColorSwatch className="size-5" />
                  <div
                    className="w-5 h-5 rounded-full border-3 border-white"
                    style={{ backgroundColor: currentColor }}
                  ></div>
                </button>

                <AnimatePresence>
                  {colorPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 mt-2 bg-[#3A3A3A] p-3 rounded-lg z-10 shadow-lg"
                    >
                      <div className="grid gap-2">
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => setCurrentColor(e.target.value)}
                          className="w-full h-8"
                        />
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">Opacity:</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={currentOpacity}
                            onChange={(e) =>
                              setCurrentOpacity(
                                Number.parseFloat(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">
                            Line Width:
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={currentLineWidth}
                            onChange={(e) =>
                              setCurrentLineWidth(
                                Number.parseInt(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">
                            Font Size:
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="72"
                            value={currentFontSize}
                            onChange={(e) =>
                              setCurrentFontSize(
                                Number.parseInt(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">
                            Blur Radius:
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={currentBlurRadius}
                            onChange={(e) =>
                              setCurrentBlurRadius(
                                Number.parseInt(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tooltip>
            <Tooltip text="Layers">
              <button
                onClick={() => setLayersOpen(!layersOpen)}
                className={
                  layersOpen
                    ? "bg-[rgba(255,255,255,0.3)] cursor-pointer text-white rounded p-1 ml-1"
                    : "p-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer hover:text-white rounded ml-1"
                }
              >
                <FiLayers className="size-5" />
              </button>
            </Tooltip>
          </div>
          <div className="flex gap-6 text-sm font-medium items-center">
            <button
              onClick={() => {
                setElements([]);
                setImageUrl(null);
              }}
              className="cursor-pointer"
            >
              Cancel
            </button>
            <button
              className="text-[#5a57c0] bg-white rounded-lg p-[6px] px-7 cursor-pointer"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      )}
      <div
        className="flex-1 flex justify-center items-center overflow-hidden relative bg-[#1E1E1E]"
        ref={editorContainerRef}
      >
        <img
          src="/android-chrome-512x512.png"
          alt=""
          className="absolute flex bottom-8 left-8 size-10"
        />
        {/* Hidden image for initial loading */}
        {/* {ImageUrl && ( */}
        <img
          ref={imgRef}
          src={ImageUrl}
          className="hidden"
          crossOrigin="anonymous"
          alt={""}
        />
        {/* )} */}

        {!ImageUrl && (
          <div className="flex items-center justify-center h-full w-full">
            <label
              htmlFor="image-select"
              className="bg-[#6D68FF] text-white rounded-lg p-3 px-8 cursor-pointer hover:bg-[#5a57c0] transition-colors"
            >
              Select Image
            </label>
          </div>
        )}

        <input
          type="file"
          className="hidden"
          id="image-select"
          onChange={(e) => selectImage(e)}
        />

        {/* Canvas for editing */}
        {ImageUrl && (
          <div
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.2s ease-in-out",
              position: "relative",
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              style={{
                cursor:
                  activeTool === "select"
                    ? "move"
                    : activeTool
                    ? "crosshair"
                    : "default",
                boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              }}
            />

            {/* Text input overlay */}
            {textInput.isEditing && (
              <input
                ref={textInputRef}
                type="text"
                value={textInput.text}
                onChange={handleTextChange}
                onKeyPress={handleTextKeyPress}
                onBlur={finishTextInput}
                style={{
                  position: "absolute",
                  left: `${textInput.x}px`,
                  top: `${textInput.y - 20}px`,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: currentColor,
                  fontSize: `${currentFontSize}px`,
                  fontFamily: "Arial",
                  minWidth: "100px",
                }}
                autoFocus
              />
            )}
          </div>
        )}

        {/* Property panel */}
        <AnimatePresence>
          {selectedElement && (
            <div className="absolute right-4 top-4">
              {renderPropertyControls()}
            </div>
          )}
        </AnimatePresence>

        {/* Layers panel */}
        <AnimatePresence>{renderLayersPanel()}</AnimatePresence>

        {/* Crop instructions */}
        {showCropInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#3A3A3A] p-3 rounded-lg shadow-lg text-white"
          >
            <div className="flex flex-col items-center gap-2">
              <h3 className="font-medium">Crop Image</h3>
              <p className="text-sm">
                Draw to select the area you want to keep
              </p>
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => {
                    setCropArea(null);
                    setActiveTool("select");
                  }}
                  className="px-3 py-1 bg-[#4A4A4A] rounded hover:bg-[#5A5A5A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCrop}
                  className="px-3 py-1 bg-[#6D68FF] rounded hover:bg-[#5a57c0] transition-colors"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default ImageEditor;
