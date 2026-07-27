import React from 'react';
import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

// Basic skeleton variants
export const SkeletonText = ({ 
  lines = 1, 
  width = '100%', 
  height = 20,
  className = ''
}: {
  lines?: number;
  width?: string | number;
  height?: number;
  className?: string;
}) => (
  <Box sx={{ width: '100%' }} className={className}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={typeof width === 'string' ? width : `${width}%`}
        height={height}
        sx={{ mb: 1 }}
        animation="wave"
      />
    ))}
  </Box>
);

export const SkeletonCircle = ({ size = 40 }: { size?: number }) => (
  <Skeleton variant="circular" width={size} height={size} animation="wave" />
);

export const SkeletonRect = ({ 
  width = '100%', 
  height = 100, 
  borderRadius = 1 
}: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
}) => (
  <Skeleton
    variant="rounded"
    width={width}
    height={height}
    sx={{ borderRadius }}
    animation="wave"
  />
);

// Card Skeleton
export const SkeletonCard = ({ height = 120 }: { height?: number }) => (
  <Card sx={{ height: '100%', minHeight: height }}>
    <CardContent>
      <SkeletonText lines={2} width={80} />
      <SkeletonRect height={60} />
    </CardContent>
  </Card>
);

// Chart Skeleton
export const SkeletonChart = ({ height = 200 }: { height?: number }) => (
  <Box sx={{ width: '100%', height }}>
    <SkeletonRect height={height} />
    <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" width={20} height={40} animation="wave" />
      ))}
    </Box>
  </Box>
);

// List Skeleton
export const SkeletonList = ({ 
  items = 3, 
  itemHeight = 60 
}: {
  items?: number;
  itemHeight?: number;
}) => (
  <Stack spacing={2}>
    {Array.from({ length: items }).map((_, index) => (
      <Box
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          height: itemHeight,
        }}
      >
        <SkeletonCircle size={40} />
        <Box sx={{ flex: 1 }}>
          <SkeletonText lines={2} width={60} />
        </Box>
        <SkeletonRect width={80} height={30} />
      </Box>
    ))}
  </Stack>
);

// Dashboard Grid Skeleton
// Dashboard Grid Skeleton
export const SkeletonDashboardGrid = ({ 
  cards = 4, 
  cardHeight = 120 
}: {
  cards?: number;
  cardHeight?: number;
}) => (
  <Box 
    sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
      gap: 3 
    }}
  >
    {Array.from({ length: cards }).map((_, index) => (
      <Box key={index}>
        <SkeletonCard height={cardHeight} />
      </Box>
    ))}
  </Box>
);

// Attendance Card Skeleton
export const SkeletonAttendanceCard = () => (
  <Card sx={{ p: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SkeletonCircle size={40} />
      <SkeletonRect width={60} height={30} />
    </Box>
    <SkeletonText lines={2} width={70} />
    <Box sx={{ mt: 2 }}>
      <SkeletonRect height={8} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <SkeletonText lines={1} width={40} />
        <SkeletonText lines={1} width={30} />
      </Box>
    </Box>
  </Card>
);

// Assignment Skeleton
export const SkeletonAssignment = () => (
  <Card sx={{ p: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonText lines={1} width={60} />
      <SkeletonRect width={80} height={28} />
    </Box>
    <SkeletonText lines={2} width={90} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      <SkeletonText lines={1} width={40} />
      <SkeletonText lines={1} width={40} />
    </Box>
  </Card>
);

// Activity Feed Skeleton
export const SkeletonActivityFeed = ({ items = 5 }: { items?: number }) => (
  <Box>
    {Array.from({ length: items }).map((_, index) => (
      <Box
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1.5,
          borderBottom: index < items - 1 ? '1px solid #e0e0e0' : 'none',
        }}
      >
        <SkeletonCircle size={36} />
        <Box sx={{ flex: 1 }}>
          <SkeletonText lines={2} width={80} />
        </Box>
        <SkeletonText lines={1} width={50} />
      </Box>
    ))}
  </Box>
);

// Statistics Card Skeleton
export const SkeletonStatsCard = () => (
  <Card sx={{ p: 2, height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <SkeletonText lines={1} width={80} />
        <SkeletonText lines={1} width={120} height={32} />
      </Box>
      <SkeletonCircle size={48} />
    </Box>
    <Box sx={{ mt: 2 }}>
      <SkeletonText lines={1} width={100} />
    </Box>
  </Card>
);

// Default export
const SkeletonLoader = {
  Text: SkeletonText,
  Circle: SkeletonCircle,
  Rect: SkeletonRect,
  Card: SkeletonCard,
  Chart: SkeletonChart,
  List: SkeletonList,
  DashboardGrid: SkeletonDashboardGrid,
  AttendanceCard: SkeletonAttendanceCard,
  Assignment: SkeletonAssignment,
  ActivityFeed: SkeletonActivityFeed,
  StatsCard: SkeletonStatsCard,
};

export default SkeletonLoader;