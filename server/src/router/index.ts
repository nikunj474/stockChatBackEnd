import express from 'express';
import queryRoutes from './queryRouters';
import stockRoutes from './stockRouters';
import newsRoutes from './newsRouters';
import stockIndustryRoutes from './stockIndustryRouters';
import stockMinMaxCompanyRoutes from './stockMinMaxCompanyRouters';
import stockSimilarCompaniesRoutes from './stockSimilarCompaniesRouters';
import similarNewsRoutes from "./similarNewsRouters";
import adminRoutes from "./adminRouters";

const router = express.Router();

router.use('/query', queryRoutes);
router.use('/stock-data', stockRoutes);
router.use('/news-events', newsRoutes);
router.use('/stocks-industry', stockIndustryRoutes);
router.use('/stocks-min-max-company', stockMinMaxCompanyRoutes);
router.use('/stocks-similar-companies', stockSimilarCompaniesRoutes);
router.use('/similar-news', similarNewsRoutes);
router.use('/admin', adminRoutes);

export default router;
