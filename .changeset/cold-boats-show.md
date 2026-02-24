---
'dispersa': major
---

- [BREAKING] rework dispersa api to be functional insted of class based. The classbased approach was unnecessary, cause consecutive builds with the same instance are unlikely + the state the instance holds is very little. Functional exposure improves the DX by a lot.
