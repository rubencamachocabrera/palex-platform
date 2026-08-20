import {
  IconHospital, IconUsers, IconCalendar, IconAlertTriangle, IconMonitor,
  IconServer, IconPrinter, IconCpu, IconTag, IconAlertCircle, IconLock,
  IconAward, IconBriefcase, IconPenLine, IconDroplet, IconThermometer,
} from "@/components/ui/Icons"

// Mapa de iconos SVG para cada sección del formulario
export const SECTION_ICON: Record<string, React.ReactNode> = {
  hospital:       <IconHospital size={18} />,
  droplet:        <IconDroplet size={18} />,
  users:          <IconUsers size={18} />,
  calendar:       <IconCalendar size={18} />,
  "alert-triangle": <IconAlertTriangle size={18} />,
  monitor:        <IconMonitor size={18} />,
  server:         <IconServer size={18} />,
  printer:        <IconPrinter size={18} />,
  cpu:            <IconCpu size={18} />,
  tag:            <IconTag size={18} />,
  "alert-circle": <IconAlertCircle size={18} />,
  lock:           <IconLock size={18} />,
  award:          <IconAward size={18} />,
  "pen-line":     <IconPenLine size={18} />,
  briefcase:      <IconBriefcase size={18} />,
  thermometer:    <IconThermometer size={18} />,
}
