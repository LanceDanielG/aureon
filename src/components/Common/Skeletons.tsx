import { Skeleton, Box, Card, TableCell, TableRow, ListItem, ListItemAvatar, ListItemText } from "@mui/material";

export const WalletCardSkeleton = () => (
    <Card
        sx={{
            height: 160,
            borderRadius: '16px',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider'
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="circular" width={32} height={32} />
        </Box>
        <Box>
            <Skeleton variant="text" width="70%" height={48} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="50%" height={16} sx={{ mt: 1 }} />
        </Box>
    </Card>
);

export const TransactionItemSkeleton = () => (
    <ListItem sx={{ py: 1.5, px: 2 }}>
        <ListItemAvatar>
            <Skeleton variant="circular" width={40} height={40} />
        </ListItemAvatar>
        <ListItemText
            primary={<Skeleton variant="text" width="60%" height={24} />}
            secondary={<Skeleton variant="text" width="40%" height={20} />}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Skeleton variant="text" width={80} height={24} />
            <Skeleton variant="text" width={50} height={16} />
        </Box>
    </ListItem>
);

export const TransactionTableRowSkeleton = () => (
    <TableRow>
        <TableCell>
            <Skeleton variant="text" width={100} height={24} />
            <Skeleton variant="text" width={60} height={16} />
        </TableCell>
        <TableCell>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="40%" height={16} />
        </TableCell>
        <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={80} height={24} />
            </Box>
        </TableCell>
        <TableCell align="right">
            <Skeleton variant="text" width={90} height={24} sx={{ ml: 'auto' }} />
            <Skeleton variant="text" width={60} height={16} sx={{ ml: 'auto' }} />
        </TableCell>
    </TableRow>
);

export const BillTableRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton variant="text" width={90} /></TableCell>
        <TableCell><Skeleton variant="text" width={120} /></TableCell>
        <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={80} />
            </Box>
        </TableCell>
        <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} /></TableCell>
        <TableCell align="right"><Skeleton variant="text" width={80} sx={{ ml: 'auto' }} /></TableCell>
        <TableCell align="center"><Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 1, mx: 'auto' }} /></TableCell>
        <TableCell align="right"><Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1, ml: 'auto' }} /></TableCell>
    </TableRow>
);

export const DashboardStatSkeleton = () => (
    <Card
        sx={{
            height: '100%',
            p: 3,
            borderRadius: '16px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none'
        }}
    >
        <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="80%" height={60} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width={100} height={20} />
        </Box>
    </Card>
);

export const HeaderSkeleton = () => (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
            <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={300} height={24} />
        </Box>
        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
    </Box>
);
